// Drill 7: Pinyin Drill — full 410-syllable pool, random speaker per play
function drillPinyinDrill() {
  const state = {
    pool: [],
    current: null,
    answered: false,
    score: 0,
    count: 0,
    maxQuestions: 10,
  };

  async function init() {
    app.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading syllable pool...</div>';
    state.pool = await loadAllSyllables();
    if (!state.pool.length) {
      app.innerHTML = `
        <div class="drill-container">
          <button class="drill-back">← Tools</button>
          <h1 class="drill-title">Pinyin Drill</h1>
          <p style="color:var(--text-muted);margin-top:20px">Audio pool not found. Check that <code>../app/audio/tone_map.json</code> is accessible.</p>
        </div>`;
      app.querySelector('.drill-back').addEventListener('click', backToTools);
      return;
    }
    nextQuestion();
  }

  function nextQuestion() {
    if (state.count >= state.maxQuestions) {
      renderDrillSummary({ drillName: 'Tone Drill', score: state.score, total: state.maxQuestions, onRestart: drillPinyinDrill });
      return;
    }
    state.answered = false;
    const pick = NoRepeat.pick('pinyin-drill', state.pool, c => c, 8);
    const [syl, toneStr] = pick.split('_');
    state.current = { syl, tone: parseInt(toneStr) };
    state.count++;
    render();
  }

  function playCurrent() {
    const btn = document.getElementById('pd-play');
    if (btn) {
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
    }
    state.current.lastSpeaker = AUDIO.randomSpeaker();
    AUDIO.play(state.current.syl, state.current.tone, state.current.lastSpeaker);
  }

  function render() {
    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Pinyin Drill</h1>
        <p class="drill-hint">All 410 Mandarin syllables · random speaker each play</p>

        <div class="drill-counter">
          Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)} · Pool: ${state.pool.length} combos
        </div>

        <div class="drill-main">
          <div class="audio-prompt">
            <button class="play-btn" id="pd-play" aria-label="Play audio">▶</button>
            <div class="tip">Tap to replay (new speaker each time)</div>
          </div>
          <div id="pd-reveal"></div>
        </div>

        <div class="drill-options">
          <button class="drill-option tone-1" data-tone="1">
            <span class="opt-label">1st</span>
            <span class="opt-desc">high level</span>
          </button>
          <button class="drill-option tone-2" data-tone="2">
            <span class="opt-label">2nd</span>
            <span class="opt-desc">rising</span>
          </button>
          <button class="drill-option tone-3" data-tone="3">
            <span class="opt-label">3rd</span>
            <span class="opt-desc">dip</span>
          </button>
          <button class="drill-option tone-4" data-tone="4">
            <span class="opt-label">4th</span>
            <span class="opt-desc">falling</span>
          </button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#pd-play').addEventListener('click', playCurrent);
    app.querySelectorAll('.drill-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.tone), btn));
    });
    setDrillKeyHandler((e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); playCurrent(); }
      else if (['1','2','3','4'].includes(e.key)) {
        const btn = app.querySelector(`.drill-option[data-tone="${e.key}"]`);
        if (btn && !state.answered) handleAnswer(parseInt(e.key), btn);
      }
    });
  }

  function handleAnswer(chosen, btn) {
    if (state.answered) return;
    state.answered = true;

    const correct = chosen === state.current.tone;
    if (correct) state.score++;
    STATS.recordSyllable(`${state.current.syl}_${state.current.tone}`, correct);

    app.querySelectorAll('.drill-option').forEach(b => {
      if (parseInt(b.dataset.tone) === state.current.tone) b.classList.add('correct');
      else if (b === btn) b.classList.add('incorrect');
    });

    const reveal = document.getElementById('pd-reveal');
    reveal.innerHTML = `
      <div class="reveal">
        ${renderSylBox(state.current.syl, state.current.tone)}
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
          Last speaker: ${(state.current.lastSpeaker || 'f1').toUpperCase()} · ${correct ? '✓' : '✗'}
        </div>
      </div>
    `;

    setTimeout(nextQuestion, 1800);
  }

  init();
}

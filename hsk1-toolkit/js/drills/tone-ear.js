// Drill 1: Tone Ear — hear a syllable, pick the tone
function drillToneEar() {
  const combos = [...hskSyllables().keys()].filter(k => !k.endsWith('_5'));
  const state = {
    current: null,
    answered: false,
    score: 0,
    count: 0,
    maxQuestions: 10,
  };

  function nextQuestion() {
    if (state.count >= state.maxQuestions) {
      renderDrillSummary({ drillName: 'Tone Ear', score: state.score, total: state.maxQuestions, onRestart: drillToneEar });
      return;
    }
    state.answered = false;
    const pick = NoRepeat.pick('tone-ear', combos, c => c, 6);
    const [syl, toneStr] = pick.split('_');
    const tone = parseInt(toneStr);
    const speakerTag = AUDIO.nextSpeaker();
    state.current = { syl, tone, speakerTag };
    state.count++;
    render();
  }

  function playCurrent() {
    const btn = document.getElementById('tone-play');
    if (btn) {
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
    }
    AUDIO.play(state.current.syl, state.current.tone, state.current.speakerTag);
  }

  function render() {
    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Tone Ear</h1>
        <p class="drill-hint">Listen, then pick the tone</p>
        <div class="drill-counter">Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)}</div>

        <div class="drill-main">
          <div class="audio-prompt">
            <button class="play-btn" id="tone-play" aria-label="Play audio">▶</button>
            <div class="tip">Tap to replay</div>
          </div>
          <div id="reveal"></div>
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
    app.querySelector('#tone-play').addEventListener('click', playCurrent);
    app.querySelectorAll('.drill-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.tone), btn));
    });

    // Keyboard shortcuts: Space = replay, 1-4 = pick tone
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

    const reveal = document.getElementById('reveal');
    reveal.innerHTML = `
      <div class="reveal">
        ${renderSylBox(state.current.syl, state.current.tone)}
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
          Speaker: ${state.current.speakerTag.toUpperCase()} ${correct ? '· ✓' : '· ✗'}
        </div>
      </div>
    `;

    setTimeout(nextQuestion, 1800);
  }

  nextQuestion();
}

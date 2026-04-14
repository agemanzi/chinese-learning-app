// Drill 8: Syllable Build — hear audio, pick Initial + Final + Tone separately
// Full 410-syllable pool, random speaker per play, hardest drill.

const ALL_INITIALS = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w'];
const COMMON_FINALS = [
  'a','o','e','ai','ei','ao','ou','an','en','ang','eng','ong','er',
  'i','ia','ie','iao','iu','ian','in','iang','ing','iong',
  'u','ua','uo','uai','ui','uan','un','uang',
  'ü','üe','üan','ün'
];

function drillSyllableBuild() {
  const state = {
    pool: [],
    current: null,
    picks: { initial: null, final: null, tone: null },
    submitted: false,
    score: 0,
    count: 0,
    maxQuestions: 8,
  };

  async function init() {
    app.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading...</div>';
    state.pool = await loadAllSyllables();
    if (!state.pool.length) {
      app.innerHTML = `<div class="drill-container"><button class="drill-back">← Tools</button><p style="padding:20px;color:var(--text-muted)">Audio pool not loaded</p></div>`;
      app.querySelector('.drill-back').addEventListener('click', backToTools);
      return;
    }
    nextQuestion();
  }

  function nextQuestion() {
    if (state.count >= state.maxQuestions) {
      renderDrillSummary({ drillName: 'Syllable Build', score: state.score, total: state.maxQuestions, onRestart: drillSyllableBuild });
      return;
    }
    state.picks = { initial: null, final: null, tone: null };
    state.submitted = false;
    const pick = NoRepeat.pick('syllable-build', state.pool, c => c, 8);
    const [syl, toneStr] = pick.split('_');
    const tone = parseInt(toneStr);
    const { initial, final } = splitInitialFinal(syl);
    state.current = { syl, tone, initial, final };
    state.count++;
    render();
  }

  function playCurrent() {
    const btn = document.getElementById('sb-play');
    if (btn) {
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
    }
    state.current.lastSpeaker = AUDIO.randomSpeaker();
    AUDIO.play(state.current.syl, state.current.tone, state.current.lastSpeaker);
  }

  function render() {
    const initialOpts = buildOptions(state.current.initial || '(none)', ALL_INITIALS, 4);
    const finalOpts = buildOptions(state.current.final, COMMON_FINALS, 4);
    const toneOpts = [1, 2, 3, 4];

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Syllable Build</h1>
        <p class="drill-hint">Listen, then pick all three parts</p>

        <div class="drill-counter">
          Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)}
        </div>

        <div class="drill-main" style="padding:24px 16px">
          <div class="audio-prompt" style="margin-bottom:20px">
            <button class="play-btn" id="sb-play" aria-label="Play audio">▶</button>
            <div class="tip">Tap to replay</div>
          </div>

          <div class="sb-row">
            <div class="sb-label">Initial</div>
            <div class="sb-options" data-dim="initial">
              ${initialOpts.map(opt => `
                <button class="sb-opt ${state.picks.initial === opt ? 'picked' : ''}" data-value="${opt}">${opt === '(none)' ? '—' : opt}</button>
              `).join('')}
            </div>
          </div>

          <div class="sb-row">
            <div class="sb-label">Final</div>
            <div class="sb-options" data-dim="final">
              ${finalOpts.map(opt => `
                <button class="sb-opt ${state.picks.final === opt ? 'picked' : ''}" data-value="${opt}">${opt}</button>
              `).join('')}
            </div>
          </div>

          <div class="sb-row">
            <div class="sb-label">Tone</div>
            <div class="sb-options" data-dim="tone">
              ${toneOpts.map(t => `
                <button class="sb-opt sb-tone tone-${t} ${state.picks.tone === t ? 'picked' : ''}" data-value="${t}">${t}</button>
              `).join('')}
            </div>
          </div>

          <div id="sb-reveal"></div>
        </div>

        <div class="row" style="gap:8px;margin-top:12px;justify-content:center">
          <button class="choice-btn" id="sb-check" ${allPicked() && !state.submitted ? '' : 'disabled'} style="${allPicked() && !state.submitted ? '' : 'opacity:0.5'}">Check</button>
          <button class="choice-btn" id="sb-next">Next →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#sb-play').addEventListener('click', playCurrent);
    app.querySelector('#sb-next').addEventListener('click', nextQuestion);
    app.querySelector('#sb-check').addEventListener('click', check);

    app.querySelectorAll('.sb-options').forEach(group => {
      const dim = group.dataset.dim;
      group.querySelectorAll('.sb-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.submitted) return;
          let val = btn.dataset.value;
          if (dim === 'tone') val = parseInt(val);
          state.picks[dim] = val;
          render();
        });
      });
    });
  }

  function allPicked() {
    return state.picks.initial !== null && state.picks.final !== null && state.picks.tone !== null;
  }

  function check() {
    if (!allPicked() || state.submitted) return;
    state.submitted = true;
    const c = state.current;

    const initialCorrect = state.picks.initial === (c.initial || '(none)');
    const finalCorrect = state.picks.final === c.final;
    const toneCorrect = state.picks.tone === c.tone;
    const allCorrect = initialCorrect && finalCorrect && toneCorrect;

    if (allCorrect) state.score++;
    STATS.recordSyllable(`${c.syl}_${c.tone}`, allCorrect);

    app.querySelectorAll('.sb-options').forEach(group => {
      const dim = group.dataset.dim;
      const correctVal = dim === 'initial' ? (c.initial || '(none)') : dim === 'final' ? c.final : c.tone;
      group.querySelectorAll('.sb-opt').forEach(btn => {
        let val = btn.dataset.value;
        if (dim === 'tone') val = parseInt(val);
        if (val === correctVal) btn.classList.add('correct');
        else if (val === state.picks[dim]) btn.classList.add('incorrect');
      });
    });

    document.getElementById('sb-reveal').innerHTML = `
      <div class="reveal" style="margin-top:16px">
        ${renderSylBox(c.syl, c.tone, { split: true })}
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
          ${c.initial || '(no initial)'} + ${c.final} + tone ${c.tone} · ${allCorrect ? '✓' : (initialCorrect+finalCorrect+toneCorrect) + '/3'}
        </div>
      </div>
    `;

    document.getElementById('sb-check').style.display = 'none';
  }

  init();
}

// Build a set of options including the correct one + random distractors
function buildOptions(correct, pool, count) {
  const opts = new Set([correct]);
  for (const o of shuffle(pool)) {
    if (opts.size >= count) break;
    opts.add(o);
  }
  return shuffle([...opts]);
}

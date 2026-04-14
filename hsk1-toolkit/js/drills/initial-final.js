// Drill 4: Initial / Final — identify the two parts of a syllable
// Only uses the 21 real consonant initials. y/w are spelling helpers
// (zero initials) for i-/u-/ü- finals, not true consonants, so excluded.
const REAL_INITIALS = new Set(['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s']);

function drillInitialFinal() {
  const pool = [...hskSyllables().keys()]
    .filter(k => !k.endsWith('_5'))
    .map(k => {
      const [syl, tone] = k.split('_');
      return { syl, tone: parseInt(tone), ...splitInitialFinal(syl) };
    })
    .filter(x => REAL_INITIALS.has(x.initial));

  const state = {
    current: null,
    count: 0,
    revealed: false,
  };

  function next() {
    state.current = pool[Math.floor(Math.random() * pool.length)];
    state.revealed = false;
    state.count++;
    render();
  }

  function render() {
    const c = state.current;
    const marked = applyToneMark(c.syl, c.tone);

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Initial / Final</h1>
        <p class="drill-hint">Tap the initial, then tap the final</p>

        <div class="drill-counter">Syllable ${state.count}</div>

        <div class="drill-main">
          <div style="font-size:48px;font-weight:500;margin-bottom:24px" class="tone-${c.tone}" id="full-syl">
            ${marked}
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            <div class="syl-box tone-${c.tone}" id="split-init" style="min-width:70px;cursor:pointer">
              ${state.revealed ? c.initial : '?'}
            </div>
            <div style="font-size:32px;color:var(--text-muted)">|</div>
            <div class="syl-box tone-${c.tone}" id="split-final" style="min-width:70px;cursor:pointer">
              ${state.revealed ? applyToneMark(c.final, c.tone) : '?'}
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:14px">
            initial + final
          </div>
        </div>

        <div class="row" style="gap:8px;margin-top:16px;justify-content:center">
          <button class="choice-btn" id="reveal-btn">${state.revealed ? 'Hide' : 'Reveal'}</button>
          <button class="choice-btn" id="play-syl">▶ Hear syllable</button>
          <button class="choice-btn" id="next-btn">Next →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#next-btn').addEventListener('click', next);
    app.querySelector('#reveal-btn').addEventListener('click', () => {
      state.revealed = !state.revealed;
      render();
    });
    app.querySelector('#play-syl').addEventListener('click', () => AUDIO.playRandom(c.syl, c.tone));
    app.querySelector('#full-syl').addEventListener('click', () => AUDIO.playRandom(c.syl, c.tone));

    // Click parts to hear them if we had separate init/final audio — for now play full syllable
    app.querySelector('#split-init').addEventListener('click', () => AUDIO.playRandom(c.syl, c.tone));
    app.querySelector('#split-final').addEventListener('click', () => AUDIO.playRandom(c.syl, c.tone));
  }

  next();
}

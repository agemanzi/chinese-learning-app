// Drill 6: Radical Spotter — show character, highlight its radical
function drillRadicalSpotter() {
  // Only characters with a known radical in our 214 list
  const pool = DATA.words
    .filter(w => w.simplified.length === 1 && w.radical && DATA.radicalByChar[w.radical])
    .filter((w, i, arr) => arr.findIndex(x => x.simplified === w.simplified) === i);

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
    const w = state.current;
    const radical = DATA.radicalByChar[w.radical];

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Radical Spotter</h1>
        <p class="drill-hint">Which radical is inside this character?</p>

        <div class="drill-counter">Character ${state.count}</div>

        <div class="drill-main">
          <div style="font-size:96px;font-weight:500;margin-bottom:8px;line-height:1">
            ${escapeHtml(w.simplified)}
          </div>
          <div style="font-size:14px;color:var(--text-muted);margin-bottom:24px">
            ${escapeHtml(w.pinyin)} — ${escapeHtml(w.meaning.split(';')[0])}
          </div>

          ${state.revealed ? `
            <div style="display:flex;gap:24px;align-items:center;padding:20px;background:var(--tone-5-bg);border-radius:12px">
              <div style="font-size:48px;color:var(--tone-1)">${escapeHtml(w.radical)}</div>
              <div style="text-align:left">
                <div style="font-size:16px;font-weight:500">${escapeHtml(radical.pinyin)}</div>
                <div style="font-size:13px;color:var(--text-muted)">${escapeHtml(radical.english)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Radical #${radical.id}</div>
              </div>
            </div>
          ` : `
            <div style="font-size:13px;color:var(--text-muted)">Tap reveal to see the radical</div>
          `}
        </div>

        <div class="row" style="gap:8px;margin-top:16px;justify-content:center">
          <button class="choice-btn" id="reveal-btn">${state.revealed ? 'Hide' : 'Reveal radical'}</button>
          <button class="choice-btn" id="next-btn">Next →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#reveal-btn').addEventListener('click', () => {
      state.revealed = !state.revealed;
      render();
    });
    app.querySelector('#next-btn').addEventListener('click', next);
  }

  next();
}

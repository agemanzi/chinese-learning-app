// Drill 5: Stroke Order — Hanzi Writer animation + trace mode
function drillStrokeOrder() {
  const chars = hskChars();
  const state = {
    char: null,
    writer: null,
    mode: 'watch', // 'watch' | 'trace'
    count: 0,
  };

  function nextChar() {
    state.char = chars[Math.floor(Math.random() * chars.length)];
    state.count++;
    render();
  }

  function render() {
    // Find the word entries this character appears in
    const relatedWords = DATA.words.filter(w => w.simplified === state.char).slice(0, 3);
    const meaning = relatedWords.length ? formatMeaning(relatedWords[0]).split(';')[0] : '';
    const pinyin = relatedWords.length ? relatedWords[0].pinyin : '';

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Stroke Order</h1>
        <p class="drill-hint">Watch the animation, then trace it yourself</p>

        <div class="drill-counter">Character ${state.count}</div>

        <div class="drill-main">
          <div id="hanzi-target" class="hanzi-target"></div>
          ${meaning ? `<div style="font-size:14px;color:var(--text-muted);margin-top:12px">${escapeHtml(pinyin)} — ${escapeHtml(meaning)}</div>` : ''}
        </div>

        <div class="row" style="gap:8px;margin-top:16px;justify-content:center;flex-wrap:wrap">
          <button class="choice-btn ${state.mode === 'watch' ? 'active' : ''}" data-mode="watch">Watch again</button>
          <button class="choice-btn ${state.mode === 'trace' ? 'active' : ''}" data-mode="trace">Trace it</button>
          <button class="choice-btn" id="next-btn">Next character →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#next-btn').addEventListener('click', nextChar);
    app.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        setupWriter();
      });
    });

    setupWriter();
  }

  function setupWriter() {
    if (!window.HanziWriter) {
      document.getElementById('hanzi-target').innerHTML = '<div style="padding:40px;color:var(--text-muted);font-size:13px">Loading Hanzi Writer...</div>';
      setTimeout(setupWriter, 500);
      return;
    }

    const target = document.getElementById('hanzi-target');
    target.innerHTML = '';
    if (state.writer) {
      try { state.writer = null; } catch {}
    }

    const opts = {
      width: 220,
      height: 220,
      padding: 5,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: '#1a1a1a',
      radicalColor: '#D85A30',
    };

    state.writer = HanziWriter.create('hanzi-target', state.char, opts);

    // Update mode button labels
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });

    if (state.mode === 'watch') {
      state.writer.animateCharacter();
    } else {
      state.writer.quiz({
        showHintAfterMisses: 2,
        highlightOnComplete: true,
      });
    }
  }

  nextChar();
}

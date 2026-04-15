// Drill 3: Word Decoder — show HSK 1 word in syllable boxes, tap to hear
function drillWordDecoder() {
  // Only multi-syllable words are interesting for decoding
  const pool = scopedWords().filter(w => w.syllables.length >= 2 && w.syllables.every(s => s.length > 0));
  const state = {
    word: null,
    showMarks: true,
    splitMode: false,
    count: 0,
  };

  function nextWord() {
    state.word = pool[Math.floor(Math.random() * pool.length)];
    state.count++;
    render();
  }

  function render() {
    const w = state.word;
    const boxes = w.syllables.map((s, i) => renderSylBox(s, w.tones[i], {
      split: state.splitMode,
      hidden: !state.showMarks,
    })).join('');

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Word Decoder</h1>
        <p class="drill-hint">Tap each box to hear · tap the word to hear all</p>

        <div class="drill-counter">Word ${state.count}</div>

        <div class="drill-main">
          <div style="font-size:56px;font-weight:500;margin-bottom:8px;cursor:pointer" id="word-char">
            ${escapeHtml(w.simplified)}
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">
            ${escapeHtml(formatMeaning(w).split(';')[0])}
          </div>
          <div class="syl-row" style="justify-content:center" id="syl-container">
            ${boxes}
          </div>
        </div>

        <div class="row" style="gap:8px;margin-top:16px;justify-content:center;flex-wrap:wrap">
          <button class="choice-btn ${state.showMarks ? 'active' : ''}" id="toggle-marks">
            ${state.showMarks ? '✓' : '○'} Pinyin marks
          </button>
          <button class="choice-btn ${state.splitMode ? 'active' : ''}" id="toggle-split">
            ${state.splitMode ? '✓' : '○'} Split init|final
          </button>
          <button class="choice-btn" id="next-btn">Next word →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#next-btn').addEventListener('click', nextWord);
    app.querySelector('#toggle-marks').addEventListener('click', () => {
      state.showMarks = !state.showMarks;
      render();
    });
    app.querySelector('#toggle-split').addEventListener('click', () => {
      state.splitMode = !state.splitMode;
      render();
    });
    app.querySelector('#word-char').addEventListener('click', () => {
      AUDIO.playWord(w);
    });
    wireSylClicks(app);
  }

  nextWord();
}

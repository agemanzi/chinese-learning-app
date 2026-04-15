// Drill 10: Type It — phone-IME style input
// See meaning → type pinyin → pick matching character

function drillTypeIt() {
  // Pool: single-character or short words we can clearly disambiguate
  const pool = scopedWords().filter(w =>
    w.simplified.length <= 2 &&
    w.syllables.length === w.simplified.length &&  // clean 1:1 syllable mapping
    w.meaning && w.meaning.length < 80
  );

  const state = {
    current: null,
    typed: '',
    revealed: false,
    count: 0,
    score: 0,
  };

  function next() {
    state.typed = '';
    state.revealed = false;
    state.current = NoRepeat.pick('type-it', pool, w => w.simplified, 5);
    state.count++;
    render();
    setTimeout(() => {
      const input = document.getElementById('ti-input');
      if (input) input.focus();
    }, 50);
  }

  function render() {
    const c = state.current;
    const candidates = getCandidates(state.typed);

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Type It</h1>
        <p class="drill-hint">See meaning, type pinyin, pick the character</p>

        <div class="drill-counter">Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)}</div>

        <div class="drill-main" style="align-items:stretch;padding:20px">
          <div class="ti-meaning">${escapeHtml(c.meaning.split(';')[0])}</div>
          <div class="ti-hint">${c.simplified.length} character${c.simplified.length > 1 ? 's' : ''} · ${c.syllables.length} syllable${c.syllables.length > 1 ? 's' : ''}</div>

          <div class="ti-input-row">
            <input type="text" id="ti-input" class="ti-input" placeholder="type pinyin..."
                   value="${escapeHtml(state.typed)}" autocomplete="off" autocapitalize="off" spellcheck="false" />
            <button class="ti-clear" id="ti-clear">×</button>
          </div>

          <div class="ti-candidates">
            ${candidates.length === 0 && state.typed ? '<div class="ti-empty">No matches — keep typing or try again</div>' : ''}
            ${candidates.slice(0, 8).map((w, i) => `
              <button class="ti-cand" data-char="${escapeHtml(w.simplified)}">
                <span class="ti-cand-char">${escapeHtml(w.simplified)}</span>
                <span class="ti-cand-pinyin">${escapeHtml(w.pinyin)}</span>
              </button>
            `).join('')}
          </div>

          ${state.revealed ? `
            <div class="reveal" style="margin-top:16px">
              ${renderWordBoxes(c)}
              <div style="margin-top:6px;font-size:24px;font-weight:500">${escapeHtml(c.simplified)}</div>
            </div>
          ` : ''}
        </div>

        <div class="row" style="gap:8px;margin-top:12px;justify-content:center">
          <button class="choice-btn" id="ti-reveal">${state.revealed ? 'Hide' : 'Give up'}</button>
          <button class="choice-btn" id="ti-skip">Next →</button>
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#ti-skip').addEventListener('click', next);
    app.querySelector('#ti-reveal').addEventListener('click', () => {
      state.revealed = !state.revealed;
      render();
    });
    app.querySelector('#ti-clear').addEventListener('click', () => {
      state.typed = '';
      render();
      document.getElementById('ti-input').focus();
    });

    const input = document.getElementById('ti-input');
    input.addEventListener('input', (e) => {
      state.typed = e.target.value.toLowerCase().replace(/v/g, 'ü').replace(/[^a-zü]/g, '');
      updateCandidates();  // keep input focused by not re-rendering the whole view
    });

    app.querySelectorAll('.ti-cand').forEach(btn => {
      btn.addEventListener('click', () => pickCandidate(btn.dataset.char, btn));
    });
  }

  function updateCandidates() {
    const candidates = getCandidates(state.typed);
    const grid = document.querySelector('.ti-candidates');
    if (!grid) return;

    grid.innerHTML = candidates.length === 0 && state.typed
      ? '<div class="ti-empty">No matches — keep typing or try again</div>'
      : candidates.slice(0, 8).map(w => `
          <button class="ti-cand" data-char="${escapeHtml(w.simplified)}">
            <span class="ti-cand-char">${escapeHtml(w.simplified)}</span>
            <span class="ti-cand-pinyin">${escapeHtml(w.pinyin)}</span>
          </button>
        `).join('');

    grid.querySelectorAll('.ti-cand').forEach(btn => {
      btn.addEventListener('click', () => pickCandidate(btn.dataset.char, btn));
    });
  }

  // Precompute stripped pinyin + pre-sort by frequency once
  const indexed = scopedWords()
    .map(w => ({ w, stripped: w.syllables.join('') }))
    .sort((a, b) => (a.w.frequency || 99999) - (b.w.frequency || 99999));

  function getCandidates(typed) {
    if (!typed) return [];
    // Prefer exact matches first, then prefix matches
    const exact = [];
    const prefix = [];
    for (const { w, stripped } of indexed) {
      if (stripped === typed) exact.push(w);
      else if (stripped.startsWith(typed)) prefix.push(w);
    }
    return [...exact, ...prefix];
  }

  function pickCandidate(char, btn) {
    const correct = char === state.current.simplified;
    if (correct) state.score++;
    STATS.recordWord(state.current.simplified, correct);

    btn.classList.add(correct ? 'correct' : 'incorrect');

    if (!correct) {
      const correctBtn = document.querySelector(`.ti-cand[data-char="${state.current.simplified}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    state.revealed = true;
    setTimeout(next, 1600);
  }

  next();
}

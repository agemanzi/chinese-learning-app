// SRS Review drill — serves words due for review from the active scope
function drillReview() {
  const now = Date.now();
  const due = scopedWords().filter(w => {
    const s = STATS.load().words[w.simplified];
    return s && s.seen > 0 && (s.srs_due || 0) <= now;
  });

  if (!due.length) {
    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">SRS Review</h1>
        <div class="drill-main" style="text-align:center;padding:40px 20px">
          <div style="font-size:48px;margin-bottom:16px">✓</div>
          <div style="font-size:18px;font-weight:500;margin-bottom:8px">All caught up!</div>
          <div style="font-size:14px;color:var(--text-muted)">No words are due right now. Come back later.</div>
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="choice-btn" id="back-btn">Back to Tools</button>
        </div>
      </div>
    `;
    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#back-btn').addEventListener('click', backToTools);
    return;
  }

  const queue = shuffle(due);
  const state = {
    idx: 0,
    answered: false,
    correct: false,
    score: 0,
  };

  function current() { return queue[state.idx]; }

  function buildOptions(w) {
    const pool = scopedWords().filter(x => x.simplified !== w.simplified && x.meaning);
    const distractors = [];
    const shuffled = shuffle(pool);
    for (const cand of shuffled) {
      if (distractors.length >= 3) break;
      distractors.push(cand);
    }
    return shuffle([w, ...distractors]);
  }

  function render() {
    if (state.idx >= queue.length) {
      renderDrillSummary({
        drillName: 'SRS Review',
        score: state.score,
        total: queue.length,
        onRestart: drillReview,
      });
      return;
    }

    const w = current();
    const options = buildOptions(w);
    const srsInfo = STATS.load().words[w.simplified];
    const dueLabel = srsInfo?.srs_due ? SRS.dueLabel(srsInfo.srs_due) : '';

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">SRS Review</h1>
        <p class="drill-hint">Pick the meaning · ${queue.length - state.idx} left</p>

        <div class="drill-counter">Score ${state.score} / ${state.idx}</div>

        <div class="drill-main" style="align-items:center">
          <div style="font-size:72px;font-weight:500;margin-bottom:6px;cursor:pointer" id="rev-char">
            ${escapeHtml(w.simplified)}
          </div>
          <div style="font-size:13px;color:var(--text-muted);min-height:18px" id="rev-pinyin">
            ${state.answered ? escapeHtml(w.pinyin) : ''}
          </div>
        </div>

        <div class="choices" style="margin-top:16px">
          ${options.map(opt => {
            let cls = 'choice-btn';
            if (state.answered) {
              if (opt.simplified === w.simplified) cls += ' correct';
              else if (opt.simplified === state.pickedChar && !state.correct) cls += ' incorrect';
            }
            return `<button class="choice-btn ${state.answered && opt.simplified === w.simplified ? 'correct' : (state.answered && opt.simplified === state.pickedChar && !state.correct ? 'incorrect' : '')}"
              data-char="${escapeHtml(opt.simplified)}"
              ${state.answered ? 'disabled' : ''}>
              ${escapeHtml(formatMeaning(opt).split(';')[0].split('·')[0].trim())}
            </button>`;
          }).join('')}
        </div>

        ${state.answered ? `
          <div style="text-align:center;margin-top:16px">
            <button class="choice-btn" id="next-btn">
              ${state.idx + 1 < queue.length ? 'Next →' : 'See results'}
            </button>
          </div>
        ` : ''}
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);

    app.querySelector('#rev-char').addEventListener('click', () => {
      AUDIO.playWord(w);
    });

    if (!state.answered) {
      app.querySelectorAll('.choice-btn[data-char]').forEach(btn => {
        btn.addEventListener('click', () => answer(btn.dataset.char));
      });
    } else {
      app.querySelector('#next-btn').addEventListener('click', () => {
        state.idx++;
        state.answered = false;
        state.pickedChar = null;
        render();
      });
    }
  }

  function answer(pickedChar) {
    const w = current();
    const isCorrect = pickedChar === w.simplified;
    state.answered = true;
    state.correct = isCorrect;
    state.pickedChar = pickedChar;
    if (isCorrect) state.score++;
    STATS.recordWord(w.simplified, isCorrect);
    render();
  }

  render();
}

// Drill 9: Word Spotter — Chinese word appears at random position/font/size
// Goal: prevent pattern-matching on position, force active attention

const SPOTTER_FONTS = [
  // Standard print (reference) — use single quotes to avoid HTML attribute conflicts
  { label: 'Sans (print)',                css: "'Noto Sans SC', 'Microsoft YaHei', sans-serif" },
  { label: 'Serif (book)',                css: "'Noto Serif SC', 'Songti SC', serif" },
  // Handwritten / brush (dramatically different)
  { label: 'Ma Shan Zheng (bold brush)',  css: "'Ma Shan Zheng', 'Kaiti SC', cursive" },
  { label: 'Zhi Mang Xing (grass)',       css: "'Zhi Mang Xing', cursive" },
  { label: 'Long Cang (flowing)',         css: "'Long Cang', cursive" },
  { label: 'Liu Jian Mao Cao (wild)',     css: "'Liu Jian Mao Cao', cursive" },
  // Display / signboard styles
  { label: 'KuaiLe (playful)',            css: "'ZCOOL KuaiLe', sans-serif" },
  { label: 'HuangYou (chunky)',           css: "'ZCOOL QingKe HuangYou', sans-serif" },
  { label: 'XiaoWei (elegant)',           css: "'ZCOOL XiaoWei', serif" },
];

function enabledSpotterFonts() {
  const ef = (SETTINGS.enabledFonts) || {};
  const enabled = SPOTTER_FONTS.filter(f => ef[f.label] !== false);
  // Fallback to first font if user disabled all
  return enabled.length ? enabled : [SPOTTER_FONTS[0]];
}

function drillWordSpotter() {
  // Pool: words where meaning is decent length
  const pool = DATA.words.filter(w => w.meaning && w.simplified.length <= 4);

  const state = {
    current: null,
    answered: false,
    score: 0,
    count: 0,
    maxQuestions: 10,
    showPinyin: false,
    tonedPinyin: true,  // color-coded tones when pinyin shown
  };

  function next() {
    if (state.count >= state.maxQuestions) {
      renderDrillSummary({ drillName: 'Word Spotter', score: state.score, total: state.maxQuestions, onRestart: drillWordSpotter });
      return;
    }
    state.answered = false;

    const correct = NoRepeat.pick('word-spotter', pool, w => w.simplified, 5);
    // Build 3 distractors with different characters
    const distractors = [];
    while (distractors.length < 3) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      if (cand.simplified !== correct.simplified &&
          !distractors.find(d => d.simplified === cand.simplified)) {
        distractors.push(cand);
      }
    }
    const options = shuffle([correct, ...distractors]);

    const allowed = enabledSpotterFonts();
    const fontPick = allowed[Math.floor(Math.random() * allowed.length)];
    state.current = {
      correct,
      options,
      font: fontPick.css,
      fontLabel: fontPick.label,
      ...randomizePresentation(correct.simplified.length),
    };
    state.count++;
    render();
  }

  // Size scales down for longer words so they stay in frame
  function randomizePresentation(charCount) {
    const maxSize = charCount >= 4 ? 72 : charCount === 3 ? 88 : 112;
    const minSize = charCount >= 4 ? 52 : 64;
    return {
      size: minSize + Math.floor(Math.random() * (maxSize - minSize)),
      posX: 20 + Math.floor(Math.random() * 60),
      posY: 20 + Math.floor(Math.random() * 60),
      rotation: (Math.random() * 10 - 5).toFixed(1),
    };
  }

  function render() {
    const c = state.current;
    const w = c.correct;

    // Build pinyin row with optional tone colors
    const pinyinBoxes = state.showPinyin ? w.syllables.map((s, i) => {
      const toneClass = state.tonedPinyin ? `tone-${w.tones[i]}` : 'tone-5';
      const marked = applyToneMark(s, w.tones[i]);
      return `<span class="ws-pinyin-box ${toneClass}">${marked}</span>`;
    }).join('') : '';
    const allowedCount = enabledSpotterFonts().length;

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Word Spotter</h1>
        <p class="drill-hint">Find the Chinese word and pick its meaning</p>

        <div class="drill-counter">Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)}</div>

        <div class="spotter-stage" id="stage">
          <div class="spotter-word" id="spot-word" style="
            left: ${c.posX}%;
            top: ${c.posY}%;
            font-size: ${c.size}px;
            font-family: ${c.font};
            transform: translate(-50%, -50%) rotate(${c.rotation}deg);
          ">
            <div>${escapeHtml(w.simplified)}</div>
            ${state.showPinyin ? `<div class="ws-pinyin-row" style="font-size:${Math.round(c.size * 0.28)}px">${pinyinBoxes}</div>` : ''}
          </div>
        </div>

        <div class="row" style="gap:8px;margin:12px 0;justify-content:center;flex-wrap:wrap">
          <button class="choice-btn" id="reload-font" title="New font · new position">↻ Font (${allowedCount}/${SPOTTER_FONTS.length})</button>
          <button class="choice-btn ${state.showPinyin ? 'active' : ''}" id="tog-pinyin">
            ${state.showPinyin ? '✓' : '○'} Show pinyin
          </button>
          <button class="choice-btn ${state.tonedPinyin ? 'active' : ''}" id="tog-tones" ${state.showPinyin ? '' : 'disabled'} style="${state.showPinyin ? '' : 'opacity:0.4'}">
            ${state.tonedPinyin ? '✓' : '○'} Tone colors
          </button>
        </div>
        <div style="text-align:center;font-size:10px;color:var(--text-muted);margin-top:-4px;margin-bottom:8px">
          Font: ${c.fontLabel}
        </div>

        <div class="drill-options">
          ${c.options.map((o, i) => `
            <button class="drill-option ws-opt" data-idx="${i}">
              ${escapeHtml(o.meaning.split(';')[0])}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#reload-font').addEventListener('click', () => {
      const c = state.current;
      const allowed = enabledSpotterFonts();
      const idx = allowed.findIndex(f => f.label === c.fontLabel);
      const next = allowed[(idx + 1) % allowed.length];
      c.font = next.css;
      c.fontLabel = next.label;
      Object.assign(c, randomizePresentation(c.correct.simplified.length));
      render();
    });
    app.querySelector('#tog-pinyin').addEventListener('click', () => {
      state.showPinyin = !state.showPinyin;
      render();
    });
    const togTones = app.querySelector('#tog-tones');
    if (togTones) {
      togTones.addEventListener('click', () => {
        if (!state.showPinyin) return;
        state.tonedPinyin = !state.tonedPinyin;
        render();
      });
    }
    app.querySelectorAll('.ws-opt').forEach(btn => {
      btn.addEventListener('click', () => answer(parseInt(btn.dataset.idx), btn));
    });
  }

  function answer(idx, btn) {
    if (state.answered) return;
    state.answered = true;

    const chosen = state.current.options[idx];
    const correct = chosen.simplified === state.current.correct.simplified;
    if (correct) state.score++;
    STATS.recordWord(state.current.correct.simplified, correct);

    // Highlight buttons
    app.querySelectorAll('.ws-opt').forEach((b, i) => {
      if (state.current.options[i].simplified === state.current.correct.simplified) b.classList.add('correct');
      else if (i === idx) b.classList.add('incorrect');
    });

    // Show the word's pinyin underneath
    const word = document.getElementById('spot-word');
    if (word) {
      word.style.opacity = '0.3';
    }

    setTimeout(next, 1600);
  }

  next();
}

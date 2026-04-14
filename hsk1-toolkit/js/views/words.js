// TAB 2: Words — searchable vocabulary list with detail sheets
let wordsFilter = '';

function viewWords() {
  app.innerHTML = `
    <h1 class="page-title">Words</h1>
    <div class="search-bar">
      <input type="text" class="search-input" id="word-search" placeholder="Search character, pinyin, or meaning..."
             value="${escapeHtml(wordsFilter)}" />
    </div>
    <p class="page-subtitle" style="margin-top:0" id="words-count"></p>
    <div id="words-list"></div>
  `;

  renderWordsList();

  document.getElementById('word-search').addEventListener('input', (e) => {
    wordsFilter = e.target.value;
    renderWordsList();
  });

  // Single delegated listener for row clicks + play buttons
  document.getElementById('words-list').addEventListener('click', (e) => {
    const playBtn = e.target.closest('.word-play');
    if (playBtn) {
      e.stopPropagation();
      const w = DATA.words.find(w => w.simplified === playBtn.dataset.play);
      if (w) AUDIO.playWord(w);
      return;
    }
    const row = e.target.closest('.word-row');
    if (row) openWordSheet(row.dataset.char);
  });
}

function renderWordsList() {
  const filtered = filterWords(wordsFilter);
  document.getElementById('words-count').textContent = `${filtered.length} of ${DATA.words.length} words`;
  document.getElementById('words-list').innerHTML =
    filtered.slice(0, 100).map(renderWordRow).join('') +
    (filtered.length > 100 ? '<div class="words-overflow">Showing first 100 — refine search to see more</div>' : '');
}

function filterWords(q) {
  if (!q) return DATA.words;
  const lower = q.toLowerCase();
  return DATA.words.filter(w =>
    w.simplified.includes(q) ||
    w.pinyin.toLowerCase().includes(lower) ||
    w.meaning.toLowerCase().includes(lower) ||
    w.syllables.join('').includes(lower)
  );
}

function renderWordRow(w) {
  const stats = STATS.getWordStats(w.simplified);
  const acc = stats.seen > 0 ? Math.round(stats.correct / stats.seen * 100) : null;
  const accBadge = acc !== null
    ? `<span class="word-acc ${acc >= 80 ? 'good' : acc >= 50 ? 'mid' : 'low'}" title="${stats.correct}/${stats.seen} correct">${acc}%</span>`
    : '';
  return `
    <div class="word-row" data-char="${escapeHtml(w.simplified)}">
      <div class="word-char">${escapeHtml(w.simplified)}</div>
      <div class="word-info">
        <div class="word-pinyin-row">${renderWordBoxes(w, { clickable: false })}</div>
        <div class="word-meaning">${escapeHtml(formatMeaning(w))}</div>
      </div>
      ${accBadge}
      <button class="word-play" data-play="${escapeHtml(w.simplified)}" aria-label="Play audio" title="Play">▶</button>
    </div>
  `;
}

function openWordSheet(char) {
  const w = DATA.words.find(w => w.simplified === char);
  if (!w) return;

  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet" onclick="event.stopPropagation()">
      <button class="sheet-close" aria-label="Close">×</button>
      <div class="sheet-char" id="sheet-hanzi">${escapeHtml(w.simplified)}</div>
      <div class="row" style="justify-content:center;margin-bottom:16px;gap:10px">
        <button class="play-btn-sm" id="sheet-play" title="Play">▶</button>
        <button class="choice-btn" id="sheet-random" title="Random word">Random →</button>
      </div>

      <div class="sheet-label">Pinyin</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${renderWordBoxes(w)}</div>

      <div class="sheet-label">Meaning</div>
      <div style="font-size:15px">${escapeHtml(formatMeaning(w))}</div>

      ${w.traditional && w.traditional !== w.simplified ? `
        <div class="sheet-label">Traditional</div>
        <div style="font-size:20px">${escapeHtml(w.traditional)}</div>
      ` : ''}

      ${w.radical ? `
        <div class="sheet-label">Radical</div>
        <div style="font-size:18px">${escapeHtml(w.radical)} ${getRadicalInfo(w.radical)}</div>
      ` : ''}

      ${w.frequency ? `
        <div class="sheet-label">Frequency rank</div>
        <div style="font-size:13px;color:var(--text-muted)">#${w.frequency}</div>
      ` : ''}

      ${(() => {
        const sents = sentencesFor(w.simplified).slice(0, 3);
        if (!sents.length) return '';
        return `
          <div class="sheet-label">Example sentences</div>
          ${sents.map(s => `
            <div class="example-sentence">
              <div class="ex-zh">${escapeHtml(s.zh)}</div>
              <div class="ex-pinyin">${escapeHtml(s.pinyin)}</div>
              <div class="ex-meaning">${escapeHtml(formatSentenceMeaning(s))}</div>
            </div>
          `).join('')}
        `;
      })()}
    </div>
  `;

  // Close on overlay click
  overlay.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.sheet-close').addEventListener('click', () => overlay.remove());

  // Play word = play syllables in sequence
  overlay.querySelector('#sheet-play').addEventListener('click', (e) => {
    e.stopPropagation();
    AUDIO.playWord(w);
  });
  // Jump to random word
  overlay.querySelector('#sheet-random').addEventListener('click', (e) => {
    e.stopPropagation();
    const rand = DATA.words[Math.floor(Math.random() * DATA.words.length)];
    overlay.remove();
    openWordSheet(rand.simplified);
  });

  // Wire syllable clicks
  wireSylClicks(overlay);

  document.body.appendChild(overlay);

  // Stroke animation (if single char)
  if (w.simplified.length === 1 && /[\u4e00-\u9fff]/.test(w.simplified)) {
    // Note: could add Hanzi Writer here, but keeping sheet fast
  }
}

function getRadicalInfo(radical) {
  const r = DATA.radicalByChar[radical];
  if (!r) return '';
  return `<span style="font-size:13px;color:var(--text-muted);margin-left:8px">${r.pinyin} — ${r.english}</span>`;
}

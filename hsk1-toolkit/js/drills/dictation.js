// Drill 11: Dictation — hear 5 words, type the pinyin with tones
// Tones entered as numbers (e.g. "ni3hao3" or "ni3 hao3") OR marks (nǐhǎo)
// Optional customPool: pass a subset of words (e.g. from a Word Pack)
function drillDictation(customPool, packName) {
  let pool = customPool;
  if (!pool || !pool.length) {
    pool = scopedWords().filter(w => w.syllables.length >= 2 && w.syllables.length <= 3);
  }
  // Prefer multi-syllable but fall back if pack has only single-syllable words
  const multi = pool.filter(w => w.syllables.length >= 2 && w.syllables.length <= 3);
  if (multi.length >= 5) pool = multi;

  const SESSION_LEN = Math.min(5, pool.length);

  const state = {
    session: null,
    idx: 0,
    score: 0,
    checked: false,
    lastResult: null,
    history: [],
  };

  function startSession() {
    const session = [];
    const used = new Set();
    while (session.length < SESSION_LEN) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (!used.has(w.simplified)) {
        used.add(w.simplified);
        session.push(w);
      }
    }
    state.session = session;
    state.idx = 0;
    state.score = 0;
    state.checked = false;
    state.lastResult = null;
    state.history = [];
    render();
  }

  function current() {
    return state.session[state.idx];
  }

  function playCurrent() {
    const w = current();
    const btn = document.getElementById('dict-play');
    if (btn) {
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
    }
    AUDIO.playWord(w);
  }

  function playSlow() {
    const w = current();
    const btn = document.getElementById('dict-play-slow');
    if (btn) {
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 600);
    }
    // 400ms gap between syllables; random speaker per syllable for variety
    AUDIO.playSequence(w.syllables, w.tones, 400, true);
  }

  function check() {
    if (state.checked) return;
    const input = document.getElementById('dict-input').value;
    const result = checkAnswer(input, current());
    state.checked = true;
    state.lastResult = result;
    if (result.allCorrect) state.score++;
    STATS.recordWord(current().simplified, result.allCorrect);
    state.history.push({ word: current(), result, skipped: false });
    render();
  }

  function nextWord() {
    if (state.idx >= SESSION_LEN - 1) {
      renderDrillSummary({
        drillName: packName ? `Dictation · ${packName}` : 'Dictation',
        score: state.score,
        total: SESSION_LEN,
        onRestart: () => drillDictation(customPool, packName),
        showRecentRuns: true,
        runHistory: state.history,
      });
      return;
    }
    state.idx++;
    state.checked = false;
    state.lastResult = null;
    render();
  }

  function render() {
    const w = current();
    const result = state.lastResult;

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Dictation${packName ? ` · ${escapeHtml(packName)}` : ''}</h1>
        <p class="drill-hint">
          Type syllables + tone numbers. Spaces optional — both work:
          <code class="dict-example">ni3 hao3</code> <code class="dict-example">ni3hao3</code>
        </p>
        <div class="drill-counter">Word ${state.idx + 1} of ${SESSION_LEN} · Score ${state.score}/${state.idx}</div>

        <div class="drill-main" style="align-items:stretch">
          <div class="dict-play-row">
            <button class="play-btn" id="dict-play" aria-label="Play word" title="Full word">▶</button>
            <button class="play-btn dict-slow-btn" id="dict-play-slow" aria-label="Play syllable by syllable" title="Syllable by syllable">▶▶</button>
          </div>
          <div class="tip dict-play-caption">
            ${w.syllables.length} syllable${w.syllables.length > 1 ? 's' : ''} · ▶ full word · ▶▶ slow
          </div>

          <input type="text" class="ti-input" id="dict-input" placeholder="e.g. ka1 ma3"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 ${state.checked ? 'readonly' : ''}
                 value="${state.checked ? escapeHtml(result.userRaw) : ''}" />

          <div class="dict-tones-help">
            <span class="tone-1">ka1</span><span class="tone-2">ka2</span><span class="tone-3">ka3</span><span class="tone-4">ka4</span>
          </div>

          ${state.checked ? renderResult(result, w) : ''}
        </div>

        <div class="row" style="gap:8px;margin-top:16px;justify-content:center">
          ${state.checked
            ? `<button class="choice-btn" id="dict-next">${state.idx >= SESSION_LEN - 1 ? 'Finish →' : 'Next word →'}</button>`
            : `<button class="choice-btn" id="dict-check">Check</button>
               <button class="choice-btn" id="dict-skip">Skip</button>`}
        </div>

        ${renderRunHistory(state.history)}
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#dict-play').addEventListener('click', playCurrent);
    app.querySelector('#dict-play-slow').addEventListener('click', playSlow);

    if (state.checked) {
      app.querySelector('#dict-next').addEventListener('click', nextWord);
    } else {
      app.querySelector('#dict-check').addEventListener('click', check);
      app.querySelector('#dict-skip').addEventListener('click', () => {
        state.checked = true;
        state.lastResult = checkAnswer('', w);
        STATS.recordWord(w.simplified, false);
        state.history.push({ word: w, result: state.lastResult, skipped: true });
        render();
      });
      const input = document.getElementById('dict-input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); check(); }
      });
    }

    setDrillKeyHandler((e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); playCurrent(); }
    });
  }

  function renderResult(result, w) {
    return `
      <div class="reveal" style="margin-top:20px;text-align:left">
        <div class="dict-check-row">
          ${w.syllables.map((syl, i) => {
            const r = result.perSyllable[i] || {};
            const tone = w.tones[i];
            const cls = r.bothCorrect ? 'correct' : 'incorrect';
            return `<span class="dict-syl ${cls}">
              <span class="tone-${tone}">${applyToneMark(syl, tone)}</span>
              ${!r.bothCorrect ? `<br><small>${r.syllableCorrect ? '' : 'syllable '}${r.toneCorrect ? '' : 'tone'}</small>` : ''}
            </span>`;
          }).join('')}
        </div>
        <div class="dict-meaning">${escapeHtml(w.simplified)} — ${escapeHtml(formatMeaning(w).split(';')[0])}</div>
        <div class="dict-grade ${result.allCorrect ? 'good' : 'bad'}">
          ${result.allCorrect ? '✓ Correct' : `✗ ${result.correctCount}/${w.syllables.length} syllables right`}
        </div>
      </div>
    `;
  }

  startSession();
}

function renderRunHistory(history) {
  if (!history || !history.length) return '';
  const correctCount = history.filter(h => h.result.allCorrect).length;
  const rows = history.map(h => {
    const w = h.word;
    const expectedHtml = w.syllables.map((syl, i) =>
      `<span class="tone-${w.tones[i]}">${applyToneMark(syl, w.tones[i])}</span>`
    ).join('');
    const userHtml = h.skipped
      ? '<span class="dict-hist-skipped">(skipped)</span>'
      : escapeHtml(h.result.userRaw) || '<span class="dict-hist-skipped">(empty)</span>';
    const wrongSyllables = h.result.perSyllable
      .map((r, i) => r.bothCorrect ? null : (w.syllables[i] + w.tones[i]))
      .filter(Boolean);
    const mismatchNote = !h.result.allCorrect && wrongSyllables.length
      ? `<span class="dict-hist-note">× ${wrongSyllables.join(', ')}</span>`
      : '';
    return `
      <li class="dict-hist-row ${h.result.allCorrect ? 'good' : 'bad'}">
        <span class="dict-hist-mark">${h.result.allCorrect ? '✓' : '✗'}</span>
        <span class="dict-hist-hanzi">${escapeHtml(w.simplified)}</span>
        <span class="dict-hist-expected">${expectedHtml}</span>
        <span class="dict-hist-user">${userHtml}</span>
        ${mismatchNote}
      </li>
    `;
  }).join('');
  return `
    <div class="dict-history">
      <div class="dict-history-header">This run · ${correctCount}/${history.length}</div>
      <ul class="dict-history-list">${rows}</ul>
    </div>
  `;
}

// Parse user input into syllable+tone pairs and compare against expected word.
function checkAnswer(userRaw, word) {
  const normalized = normalizePinyinInput(userRaw);
  const expected = word.syllables.map((s, i) => ({ syl: s, tone: word.tones[i] }));

  const perSyllable = expected.map((e, i) => {
    const got = normalized[i] || { syl: '', tone: 0 };
    return {
      syllableCorrect: got.syl === e.syl,
      toneCorrect: got.tone === e.tone,
      bothCorrect: got.syl === e.syl && got.tone === e.tone,
    };
  });

  const correctCount = perSyllable.filter(r => r.bothCorrect).length;
  return {
    userRaw,
    perSyllable,
    correctCount,
    allCorrect: correctCount === expected.length,
  };
}

// Normalize pinyin input to [{syl, tone}, ...]
// Accepts: "ni3hao3", "ni3 hao3", "nǐhǎo", "ni hao" (untoned = wrong tone)
const TONE_MARK_TO_NUM = {
  'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,
  'ī':1,'í':2,'ǐ':3,'ì':4,'ō':1,'ó':2,'ǒ':3,'ò':4,
  'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4,
};
const TONE_STRIP = { 'ā':'a','á':'a','ǎ':'a','à':'a','ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i','ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u','ǖ':'ü','ǘ':'ü','ǚ':'ü','ǜ':'ü' };

function normalizePinyinInput(raw) {
  if (!raw) return [];
  const input = raw.trim().toLowerCase().replace(/v/g, 'ü');

  // Case 1: tone numbers present (ni3hao3 or ni3 hao3)
  if (/\d/.test(input)) {
    const parts = input.replace(/\s+/g, '').match(/([a-zü]+)(\d)/g) || [];
    return parts.map(p => {
      const m = p.match(/([a-zü]+)(\d)/);
      return { syl: m[1], tone: parseInt(m[2]) };
    });
  }

  // Case 2: tone marks (nǐhǎo) — convert marks to numbers then split
  const syllables = [];
  let currentSyl = '';
  let currentTone = 0;
  for (const ch of input) {
    if (TONE_MARK_TO_NUM[ch]) {
      currentSyl += TONE_STRIP[ch];
      currentTone = TONE_MARK_TO_NUM[ch];
    } else if (/[a-zü]/.test(ch)) {
      currentSyl += ch;
    } else if (ch === ' ') {
      if (currentSyl) { syllables.push({ syl: currentSyl, tone: currentTone }); currentSyl = ''; currentTone = 0; }
    }
  }
  if (currentSyl) syllables.push({ syl: currentSyl, tone: currentTone });

  // If only one syllable came out but expected multiple, try to greedy-split
  // (nihao → ni hao). This is heuristic; good enough for 2-3 syllable words.
  if (syllables.length === 1 && !input.includes(' ')) {
    return greedySplit(syllables[0].syl, currentTone);
  }
  return syllables;
}

function greedySplit(s, overallTone) {
  // Try to split a run like "nihao" into syllables by matching finals.
  // Best-effort: split at common boundaries. If we can't, return as-is.
  const boundaries = ['ao','ai','ei','ao','ou','an','en','ang','eng','ing','ong','ia','iao','iu','ian','in','iang','ua','uo','ui','uan','un','uang','üe','üan','ün','a','o','e','i','u','ü'];
  // Simple approach: if the string matches two valid syllables cleanly, split
  for (let cut = 1; cut < s.length; cut++) {
    const a = s.slice(0, cut);
    const b = s.slice(cut);
    if (isValidSyllable(a) && isValidSyllable(b)) {
      return [{ syl: a, tone: 0 }, { syl: b, tone: overallTone }];
    }
  }
  return [{ syl: s, tone: overallTone }];
}

function isValidSyllable(s) {
  if (!s) return false;
  const initials = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
  for (const i of initials) {
    if (s.startsWith(i)) {
      const rest = s.slice(i.length);
      return rest.length > 0 && /^[aeiouü]/.test(rest);
    }
  }
  return /^[aeiouü]/.test(s);
}

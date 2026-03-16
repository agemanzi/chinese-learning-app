// ============================================================
// Chinese Learning App - Application Logic (API-backed)
// ============================================================

(function() {
  'use strict';

  // ---- App State (loaded from backend on init) ----
  let DB = { vocabulary: [], tones: [], initials: [], pronunciation_pairs: [] };
  let PROGRESS = null;

  async function init() {
    try {
      const [db, progress] = await Promise.all([API.getDB(), API.getProgress()]);
      DB = db;
      PROGRESS = progress;
      // Populate globals for drills
      TONES = db.tones || [];
      INITIALS = db.initials || [];
      PRONUNCIATION_PAIRS = db.pronunciation_pairs || [];
    } catch (e) {
      console.error('Failed to load data from backend:', e);
      app.innerHTML = `<div class="empty-state"><div class="empty-state-icon">&#x26A0;</div>
        <div class="empty-state-text">Cannot connect to backend.<br>Run <code>python server.py</code> first.</div></div>`;
      return;
    }
    navigate();
  }

  // ---- Progress helpers ----
  async function loadProgress() {
    if (!PROGRESS) PROGRESS = await API.getProgress();
    return PROGRESS;
  }

  async function saveProgress(p) {
    PROGRESS = p;
    await API.saveProgress(p);
  }

  // ---- SRS Engine ----
  function getVocabSRS(progress, vocabId) {
    return progress.vocabulary[vocabId] || {
      correctCount: 0, incorrectCount: 0,
      lastReviewed: 0, nextReview: 0,
      interval: 0, easeFactor: 2.5, streak: 0
    };
  }

  function updateSRS(srs, quality) {
    const now = Date.now();
    srs.lastReviewed = now;
    if (quality >= 3) {
      srs.correctCount++;
      if (srs.streak === 0) srs.interval = 1;
      else if (srs.streak === 1) srs.interval = 3;
      else srs.interval = Math.round(srs.interval * srs.easeFactor);
      srs.easeFactor = Math.max(1.3, srs.easeFactor + 0.1 * (quality - 3));
      srs.streak++;
    } else {
      srs.incorrectCount++;
      srs.interval = 0;
      srs.easeFactor = Math.max(1.3, srs.easeFactor - 0.2);
      srs.streak = 0;
    }
    srs.nextReview = now + srs.interval * 86400000;
    return srs;
  }

  function getDueCards(progress, vocabulary) {
    const now = Date.now();
    return vocabulary.filter(v => {
      const srs = getVocabSRS(progress, v.id);
      return srs.nextReview <= now;
    });
  }

  // ---- Streak ----
  function updateStreak(progress) {
    const today = toLocalDateStr(new Date());
    if (progress.lastStudyDate === today) return;
    const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
    if (progress.lastStudyDate === yesterday) {
      progress.streakDays++;
    } else if (progress.lastStudyDate !== today) {
      progress.streakDays = 1;
    }
    progress.lastStudyDate = today;
  }

  function addSession(progress, type, score, total) {
    progress.sessions.unshift({
      date: toLocalDateStr(new Date()),
      time: new Date().toLocaleTimeString('cs'),
      type, score, total
    });
    if (progress.sessions.length > 50) progress.sessions.length = 50;
    updateStreak(progress);
  }

  // ---- Utilities ----
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHTML(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function toLocalDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ---- Router ----
  const appEl = document.getElementById('app');
  // alias for innerHTML usage
  const app = appEl;
  const views = { home: viewHome, pinyin: viewPinyin, sounds: viewSounds, tutor: viewTutor, flashcards: viewFlashcards, vocabulary: viewVocabulary, calendar: viewCalendar, progress: viewProgress };

  function navigate() {
    const hash = location.hash.replace('#/', '') || 'home';
    const viewFn = views[hash] || viewHome;
    document.querySelectorAll('#navbar a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-view') === hash);
    });
    viewFn();
  }

  window.addEventListener('hashchange', navigate);
  window.addEventListener('DOMContentLoaded', init);

  // ============================================================
  // VIEW: Home / Dashboard
  // ============================================================
  async function viewHome() {
    const progress = await loadProgress();
    const vocab = DB.vocabulary;
    const dueCount = getDueCards(progress, vocab).length;
    const mastered = vocab.filter(v => getVocabSRS(progress, v.id).streak >= 3).length;
    const totalDrills = progress.pinyin.initialsCorrect + progress.pinyin.initialsIncorrect +
                        progress.pinyin.tonesCorrect + progress.pinyin.tonesIncorrect;

    const worksheets = await API.getWorksheets();

    app.innerHTML = `
      <div class="page-header">
        <h1>&#x5B66;&#x4E60;&#x52A0;&#x6CB9;!</h1>
        <p>Chinese Learning App</p>
        ${progress.streakDays > 0 ? `<div class="streak-badge" style="margin-top:8px">&#x1F525; ${progress.streakDays} day streak</div>` : ''}
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${vocab.length}</div>
          <div class="stat-label">Words</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${dueCount}</div>
          <div class="stat-label">Due for review</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${mastered}</div>
          <div class="stat-label">Mastered</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalDrills}</div>
          <div class="stat-label">Drill answers</div>
        </div>
      </div>
      <div class="quick-actions">
        <a href="#/flashcards" class="quick-action">
          <span class="quick-action-icon">&#x1F0CF;</span>
          <div>
            <div class="quick-action-text">Flashcards${dueCount > 0 ? ` (${dueCount} due)` : ''}</div>
            <div class="quick-action-desc">SRS spaced repetition review</div>
          </div>
        </a>
        <a href="#/pinyin" class="quick-action">
          <span class="quick-action-icon">&#x1F524;</span>
          <div>
            <div class="quick-action-text">Pinyin Drills</div>
            <div class="quick-action-desc">Tones, initials & finals practice</div>
          </div>
        </a>
<a href="#/vocabulary" class="quick-action">
          <span class="quick-action-icon">&#x1F4DA;</span>
          <div>
            <div class="quick-action-text">Vocabulary Manager</div>
            <div class="quick-action-desc">Add & manage words</div>
          </div>
        </a>
      </div>
      ${worksheets.length > 0 ? `
      <div class="card" style="margin-top:20px">
        <div class="card-title">Worksheets</div>
        <div class="resources-list">
          ${worksheets.map(w => `
            <a href="${w.url}" target="_blank" class="resource-link">
              <span class="resource-icon">&#x1F4C4;</span>
              <div>
                <div class="resource-name">${escapeHTML(w.filename.replace(/_/g, ' ').replace('.pdf', ''))}</div>
                <div class="resource-desc">${w.size_kb} KB &middot; updated ${w.modified}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>` : ''}
      <div class="card" style="margin-top:20px">
        <div class="card-title">Useful Resources</div>
        <div class="resources-list">
          <a href="https://www.mdbg.net/chinese/dictionary" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F4D6;</span>
            <div>
              <div class="resource-name">MDBG Dictionary</div>
              <div class="resource-desc">Chinese-English dictionary with pinyin, stroke order, examples</div>
            </div>
          </a>
          <a href="https://www.pleco.com/" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F4F1;</span>
            <div>
              <div class="resource-name">Pleco</div>
              <div class="resource-desc">Best mobile Chinese dictionary app (iOS/Android)</div>
            </div>
          </a>
          <a href="https://yoyochinese.com/chinese-learning-tools/Mandarin-Chinese-pronunciation-lesson/pinyin-chart-table" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F50A;</span>
            <div>
              <div class="resource-name">YoyoChinese Pinyin Chart</div>
              <div class="resource-desc">Interactive pinyin chart with audio for every syllable</div>
            </div>
          </a>
          <a href="https://www.digmandarin.com/hsk-1-vocabulary-list.html" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F4CB;</span>
            <div>
              <div class="resource-name">HSK 1 Vocabulary List</div>
              <div class="resource-desc">Complete HSK 1 word list with pinyin and English</div>
            </div>
          </a>
          <a href="https://hanziwriter.org/" target="_blank" class="resource-link">
            <span class="resource-icon">&#x270D;</span>
            <div>
              <div class="resource-name">Hanzi Writer</div>
              <div class="resource-desc">Animated stroke order for any Chinese character</div>
            </div>
          </a>
          <a href="https://forvo.com/languages/zh/" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F3A4;</span>
            <div>
              <div class="resource-name">Forvo</div>
              <div class="resource-desc">Native speaker pronunciation for any word</div>
            </div>
          </a>
          <a href="https://chinesefor.us/chinese-character-worksheet-generator/" target="_blank" class="resource-link">
            <span class="resource-icon">&#x1F4DD;</span>
            <div>
              <div class="resource-name">Character Worksheet Generator</div>
              <div class="resource-desc">Practice writing characters (also used by our worksheet script)</div>
            </div>
          </a>
        </div>
      </div>
    `;
  }

  // ============================================================
  // VIEW: Pinyin Drills
  // ============================================================
  function viewPinyin() {
    let drillType = 'tones';
    let questions = [];
    let current = 0;
    let score = 0;
    let answered = false;
    const QUIZ_LEN = 10;

    function generateToneQuestions() {
      const qs = [];
      for (let i = 0; i < QUIZ_LEN; i++) {
        const tone = TONES[Math.floor(Math.random() * TONES.length)];
        const options = shuffle(TONES).slice(0, 4);
        if (!options.find(o => o.tone === tone.tone)) {
          options[Math.floor(Math.random() * 4)] = tone;
        }
        qs.push({ type: 'tone', prompt: tone.example, answer: tone.tone, answerLabel: `${tone.tone}. tón - ${tone.czech}`, options: options.map(o => ({ label: `${o.tone}. tón`, value: o.tone, detail: o.czech })) });
      }
      return qs;
    }

    function generateInitialQuestions() {
      const qs = [];
      const pool = shuffle(INITIALS);
      for (let i = 0; i < QUIZ_LEN; i++) {
        const init = pool[i % pool.length];
        const options = shuffle(INITIALS).slice(0, 4);
        if (!options.find(o => o.pinyin === init.pinyin)) {
          options[Math.floor(Math.random() * 4)] = init;
        }
        qs.push({ type: 'initial', prompt: init.pinyin, promptDetail: init.example, answer: init.slovak, options: options.map(o => ({ label: o.slovak, value: o.slovak, detail: o.pinyin })) });
      }
      return qs;
    }

    function startDrill(type) {
      drillType = type;
      current = 0;
      score = 0;
      answered = false;
      questions = type === 'tones' ? generateToneQuestions() : generateInitialQuestions();
      render();
    }

    function render() {
      if (current >= questions.length) { renderResult(); return; }
      const q = questions[current];
      app.innerHTML = `
        <div class="page-header"><h1>Pinyin Drills</h1>
          <p>${drillType === 'tones' ? 'Identify the tone' : 'Match the initial'}</p></div>
        <div class="drill-selector">
          <button class="drill-tab ${drillType === 'tones' ? 'active' : ''}" data-drill="tones">Tóny</button>
          <button class="drill-tab ${drillType === 'initials' ? 'active' : ''}" data-drill="initials">Iniciály</button>
        </div>
        <div class="quiz-counter">Question ${current + 1} / ${questions.length} &nbsp;|&nbsp; Score: ${score}</div>
        <div class="card">
          <div class="quiz-prompt">
            <div class="quiz-pinyin">${escapeHTML(q.prompt)}</div>
            ${q.promptDetail ? `<div class="quiz-info">${escapeHTML(q.promptDetail)}</div>` : ''}
            <div class="quiz-info">${q.type === 'tone' ? 'Který tón?' : 'Jaká výslovnost?'}</div>
          </div>
          <div class="quiz-options" id="quiz-options">
            ${q.options.map((o, i) => `
              <button class="quiz-option" data-value="${escapeHTML(String(o.value))}" data-idx="${i}">
                ${escapeHTML(o.label)}<br><small style="color:var(--text-secondary)">${escapeHTML(o.detail || '')}</small>
              </button>
            `).join('')}
          </div>
          <div id="quiz-feedback"></div>
        </div>
      `;
      app.querySelectorAll('.drill-tab').forEach(btn => btn.addEventListener('click', () => startDrill(btn.dataset.drill)));
      app.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', () => handleAnswer(btn)));
    }

    async function handleAnswer(btn) {
      if (answered) return;
      answered = true;
      const q = questions[current];
      const chosen = btn.dataset.value;
      const isCorrect = String(chosen) === String(q.answer);
      if (isCorrect) score++;

      app.querySelectorAll('.quiz-option').forEach(b => {
        if (String(b.dataset.value) === String(q.answer)) b.classList.add('correct');
        else if (b === btn && !isCorrect) b.classList.add('incorrect');
      });

      const progress = await loadProgress();
      if (q.type === 'tone') {
        if (isCorrect) progress.pinyin.tonesCorrect++;
        else { progress.pinyin.tonesIncorrect++; if (!progress.pinyin.weakTones.includes(q.answer)) progress.pinyin.weakTones.push(q.answer); }
      } else {
        if (isCorrect) progress.pinyin.initialsCorrect++;
        else { progress.pinyin.initialsIncorrect++; if (!progress.pinyin.weakInitials.includes(q.prompt)) progress.pinyin.weakInitials.push(q.prompt); }
      }
      await saveProgress(progress);

      const fb = document.getElementById('quiz-feedback');
      fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
      fb.textContent = isCorrect ? 'Correct!' : `Wrong — answer: ${q.answerLabel || q.answer}`;
      setTimeout(() => { current++; answered = false; render(); }, 1200);
    }

    async function renderResult() {
      const progress = await loadProgress();
      addSession(progress, `Pinyin: ${drillType}`, score, QUIZ_LEN);
      await saveProgress(progress);
      const pct = Math.round(score / QUIZ_LEN * 100);
      app.innerHTML = `
        <div class="page-header"><h1>Pinyin Drills</h1></div>
        <div class="card" style="text-align:center">
          <div class="card-title">Results</div>
          <div class="stat-value" style="font-size:48px">${pct}%</div>
          <p style="margin:8px 0;color:var(--text-secondary)">${score} / ${QUIZ_LEN} correct</p>
          <div class="progress-bar-container"><div class="progress-bar-fill ${pct >= 70 ? 'green' : pct >= 40 ? 'gold' : 'red'}" style="width:${pct}%"></div></div>
          <div class="btn-group" style="justify-content:center;margin-top:20px">
            <button class="btn btn-primary" id="retry-btn">Try Again</button>
            <a href="#/home" class="btn btn-secondary">Home</a>
          </div>
        </div>
      `;
      document.getElementById('retry-btn').addEventListener('click', () => startDrill(drillType));
    }

    startDrill('tones');
  }

  // ============================================================
  // VIEW: Pronunciation Pairs
  // ============================================================
  function viewPairs() {
    let drillMode = 'sound2pinyin'; // 'sound2pinyin' | 'pinyin2sound' | 'whats_different'
    let questions = [];
    let current = 0;
    let score = 0;
    let answered = false;

    function generateQuestions_sound2pinyin() {
      // Show Czech/Slovak approximation → pick the correct pinyin (no hints on buttons)
      return shuffle(PRONUNCIATION_PAIRS).slice(0, Math.min(10, PRONUNCIATION_PAIRS.length)).map(pair => {
        const askA = Math.random() > 0.5;
        return {
          pair,
          mode: 'sound2pinyin',
          prompt: askA ? pair.aSlovak : pair.bSlovak,
          answer: askA ? pair.a : pair.b,
          wrong: askA ? pair.b : pair.a,
          answerSlovak: askA ? pair.aSlovak : pair.bSlovak,
          tip: pair.tip
        };
      });
    }

    function generateQuestions_pinyin2sound() {
      // Show pinyin → pick the correct Czech/Slovak approximation
      return shuffle(PRONUNCIATION_PAIRS).slice(0, Math.min(10, PRONUNCIATION_PAIRS.length)).map(pair => {
        const askA = Math.random() > 0.5;
        return {
          pair,
          mode: 'pinyin2sound',
          prompt: askA ? pair.a : pair.b,
          answer: askA ? pair.aSlovak : pair.bSlovak,
          wrong: askA ? pair.bSlovak : pair.aSlovak,
          answerPinyin: askA ? pair.a : pair.b,
          tip: pair.tip
        };
      });
    }

    function generateQuestions_whatsDifferent() {
      // Show both pinyin side by side → "What's the difference?" → pick the correct description
      return shuffle(PRONUNCIATION_PAIRS).slice(0, Math.min(10, PRONUNCIATION_PAIRS.length)).map(pair => {
        // Generate wrong tips from other pairs
        const otherTips = PRONUNCIATION_PAIRS.filter(p => p.tip !== pair.tip).map(p => p.tip);
        const wrongTip = otherTips.length > 0 ? shuffle(otherTips)[0] : 'Same sound';
        return {
          pair,
          mode: 'whats_different',
          prompt: `${pair.a}  vs  ${pair.b}`,
          answer: pair.tip,
          wrong: wrongTip,
          tip: pair.tip
        };
      });
    }

    function start(mode) {
      if (mode) drillMode = mode;
      questions = drillMode === 'sound2pinyin' ? generateQuestions_sound2pinyin()
               : drillMode === 'pinyin2sound' ? generateQuestions_pinyin2sound()
               : generateQuestions_whatsDifferent();
      current = 0;
      score = 0;
      answered = false;
      render();
    }

    function render() {
      if (current >= questions.length) { renderResult(); return; }
      const q = questions[current];
      const opts = shuffle([
        { label: q.answer, correct: true },
        { label: q.wrong, correct: false }
      ]);

      let promptHTML = '';
      let subtitle = '';

      if (q.mode === 'sound2pinyin') {
        subtitle = 'Which pinyin matches this pronunciation?';
        promptHTML = `
          <div class="quiz-prompt">
            <div class="quiz-info">You hear something like:</div>
            <div class="quiz-pinyin" style="color:var(--gold);font-size:40px;font-style:italic">${escapeHTML(q.prompt)}</div>
          </div>
        `;
      } else if (q.mode === 'pinyin2sound') {
        subtitle = 'How is this pinyin pronounced?';
        promptHTML = `
          <div class="quiz-prompt">
            <div class="quiz-info">This pinyin:</div>
            <div class="quiz-pinyin" style="font-size:40px">${escapeHTML(q.prompt)}</div>
            <div class="quiz-info">sounds like...</div>
          </div>
        `;
      } else {
        subtitle = 'What\'s the difference between these two?';
        promptHTML = `
          <div class="quiz-prompt">
            <div class="pair-display">
              <div class="pair-item"><div class="pair-pinyin">${escapeHTML(q.pair.a)}</div></div>
              <div class="pair-vs">vs</div>
              <div class="pair-item"><div class="pair-pinyin">${escapeHTML(q.pair.b)}</div></div>
            </div>
          </div>
        `;
      }

      app.innerHTML = `
        <div class="page-header"><h1>Pronunciation Pairs</h1><p>${subtitle}</p></div>
        <div class="drill-selector">
          <button class="drill-tab ${drillMode === 'sound2pinyin' ? 'active' : ''}" data-mode="sound2pinyin">Sound &rarr; Pinyin</button>
          <button class="drill-tab ${drillMode === 'pinyin2sound' ? 'active' : ''}" data-mode="pinyin2sound">Pinyin &rarr; Sound</button>
          <button class="drill-tab ${drillMode === 'whats_different' ? 'active' : ''}" data-mode="whats_different">What's Different?</button>
        </div>
        <div class="quiz-counter">Question ${current + 1} / ${questions.length} &nbsp;|&nbsp; Score: ${score}</div>
        <div class="card">
          ${promptHTML}
          <div class="quiz-options" id="pair-options">
            ${opts.map(o => `<button class="quiz-option" data-correct="${o.correct}" style="font-size:${q.mode === 'whats_different' ? '14' : '20'}px;font-weight:${q.mode === 'whats_different' ? '500' : '700'}">${escapeHTML(o.label)}</button>`).join('')}
          </div>
          <div id="pair-feedback"></div>
        </div>
      `;

      app.querySelectorAll('.drill-tab').forEach(btn => btn.addEventListener('click', () => start(btn.dataset.mode)));
      app.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', () => handlePairAnswer(btn)));
    }

    async function handlePairAnswer(btn) {
      if (answered) return;
      answered = true;
      const isCorrect = btn.dataset.correct === 'true';
      if (isCorrect) score++;

      app.querySelectorAll('.quiz-option').forEach(b => {
        if (b.dataset.correct === 'true') b.classList.add('correct');
        else if (b === btn && !isCorrect) b.classList.add('incorrect');
      });

      const progress = await loadProgress();
      const q = questions[current];
      const pairKey = q.pair.a + '|' + q.pair.b;
      if (!progress.pairs[pairKey]) progress.pairs[pairKey] = { correctCount: 0, incorrectCount: 0 };
      if (isCorrect) progress.pairs[pairKey].correctCount++;
      else progress.pairs[pairKey].incorrectCount++;
      await saveProgress(progress);

      const fb = document.getElementById('pair-feedback');
      fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;

      if (isCorrect) {
        fb.textContent = 'Correct!';
      } else {
        fb.innerHTML = `Wrong! Answer: <strong>${escapeHTML(q.answer)}</strong><br><small>${escapeHTML(q.pair.a)} [${escapeHTML(q.pair.aSlovak)}] vs ${escapeHTML(q.pair.b)} [${escapeHTML(q.pair.bSlovak)}] — ${escapeHTML(q.tip)}</small>`;
      }

      setTimeout(() => { current++; answered = false; render(); }, 1800);
    }

    async function renderResult() {
      const progress = await loadProgress();
      addSession(progress, `Pairs: ${drillMode}`, score, questions.length);
      await saveProgress(progress);
      const pct = Math.round(score / questions.length * 100);
      app.innerHTML = `
        <div class="page-header"><h1>Pronunciation Pairs</h1></div>
        <div class="card" style="text-align:center">
          <div class="card-title">Results</div>
          <div class="stat-value" style="font-size:48px">${pct}%</div>
          <p style="margin:8px 0;color:var(--text-secondary)">${score} / ${questions.length} correct</p>
          <div class="progress-bar-container"><div class="progress-bar-fill ${pct >= 70 ? 'green' : pct >= 40 ? 'gold' : 'red'}" style="width:${pct}%"></div></div>
          <div class="btn-group" style="justify-content:center;margin-top:20px">
            <button class="btn btn-primary" id="retry-pairs">Try Again</button>
            <a href="#/home" class="btn btn-secondary">Home</a>
          </div>
        </div>
      `;
      document.getElementById('retry-pairs').addEventListener('click', () => start(drillMode));
    }

    start('sound2pinyin');
  }

  // ============================================================
  // VIEW: Flashcards (SRS)
  // ============================================================
  async function viewFlashcards() {
    const vocab = DB.vocabulary;
    let progress = await loadProgress();
    let dueCards = getDueCards(progress, vocab);
    let currentIdx = 0;
    let flipped = false;
    let sessionScore = 0;
    let sessionTotal = 0;

    function render() {
      if (dueCards.length === 0) {
        app.innerHTML = `
          <div class="page-header"><h1>Flashcards</h1><p>Spaced repetition review</p></div>
          <div class="empty-state">
            <div class="empty-state-icon">&#x2705;</div>
            <div class="empty-state-text">All caught up! No cards due for review.</div><br>
            <button class="btn btn-primary" id="review-all">Review all cards</button><br><br>
            <a href="#/home" class="btn btn-secondary">Home</a>
          </div>
        `;
        const btn = document.getElementById('review-all');
        if (btn) btn.addEventListener('click', () => { dueCards = shuffle(vocab); currentIdx = 0; flipped = false; render(); });
        return;
      }
      if (currentIdx >= dueCards.length) { renderSessionResult(); return; }
      const card = dueCards[currentIdx];
      const srs = getVocabSRS(progress, card.id);
      app.innerHTML = `
        <div class="page-header"><h1>Flashcards</h1><p>Card ${currentIdx + 1} / ${dueCards.length}</p></div>
        <div class="quiz-counter">Session: ${sessionScore}/${sessionTotal} correct</div>
        <div class="flashcard-container">
          <div class="flashcard" id="flashcard">
            <div class="flashcard-face">
              <div class="flashcard-chinese">${escapeHTML(card.chinese)}</div>
              <div class="flashcard-hint">Click to reveal</div>
              ${srs.streak > 0 ? `<div class="flashcard-category" style="margin-top:12px">Streak: ${srs.streak}</div>` : ''}
            </div>
            <div class="flashcard-face flashcard-back">
              <div class="flashcard-pinyin">${escapeHTML(card.pinyin)}</div>
              <div class="flashcard-meaning">${escapeHTML(card.meaning)}</div>
              <div class="flashcard-category">${escapeHTML(card.category)}</div>
            </div>
          </div>
        </div>
        <div id="grade-area" style="display:none">
          <p style="text-align:center;margin-bottom:10px;color:var(--text-secondary);font-size:14px">How well did you know this?</p>
          <div class="grade-buttons">
            <button class="grade-btn again" data-quality="1">Again</button>
            <button class="grade-btn hard" data-quality="2">Hard</button>
            <button class="grade-btn good" data-quality="3">Good</button>
            <button class="grade-btn easy" data-quality="4">Easy</button>
          </div>
        </div>
      `;
      const flashcard = document.getElementById('flashcard');
      const gradeArea = document.getElementById('grade-area');
      flashcard.addEventListener('click', () => { flashcard.classList.toggle('flipped'); flipped = !flipped; if (flipped) gradeArea.style.display = 'block'; });
      gradeArea.querySelectorAll('.grade-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const quality = parseInt(btn.dataset.quality);
          sessionTotal++;
          if (quality >= 3) sessionScore++;
          let srs = getVocabSRS(progress, card.id);
          srs = updateSRS(srs, quality);
          progress.vocabulary[card.id] = srs;
          await saveProgress(progress);
          currentIdx++;
          flipped = false;
          render();
        });
      });
    }

    async function renderSessionResult() {
      addSession(progress, 'Flashcards', sessionScore, sessionTotal);
      await saveProgress(progress);
      const pct = sessionTotal > 0 ? Math.round(sessionScore / sessionTotal * 100) : 0;
      app.innerHTML = `
        <div class="page-header"><h1>Flashcards</h1></div>
        <div class="card" style="text-align:center">
          <div class="card-title">Session Complete!</div>
          <div class="stat-value" style="font-size:48px">${pct}%</div>
          <p style="margin:8px 0;color:var(--text-secondary)">${sessionScore} / ${sessionTotal} good or easy</p>
          <div class="progress-bar-container"><div class="progress-bar-fill ${pct >= 70 ? 'green' : pct >= 40 ? 'gold' : 'red'}" style="width:${pct}%"></div></div>
          <div class="btn-group" style="justify-content:center;margin-top:20px">
            <button class="btn btn-primary" id="fc-restart">Review Again</button>
            <a href="#/home" class="btn btn-secondary">Home</a>
          </div>
        </div>
      `;
      document.getElementById('fc-restart').addEventListener('click', async () => {
        progress = await loadProgress();
        dueCards = getDueCards(progress, DB.vocabulary);
        if (dueCards.length === 0) dueCards = shuffle(DB.vocabulary);
        currentIdx = 0; sessionScore = 0; sessionTotal = 0; flipped = false;
        render();
      });
    }

    render();
  }

  // ============================================================
  // VIEW: Vocabulary Manager
  // ============================================================
  async function viewVocabulary() {
    let vocab = DB.vocabulary;
    let search = '';
    let filterCat = '';

    function getCategories() {
      return [...new Set(vocab.map(v => v.category))].sort();
    }

    function render() {
      const filtered = vocab.filter(v => {
        const matchSearch = !search || v.chinese.includes(search) || v.pinyin.toLowerCase().includes(search.toLowerCase()) || v.meaning.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCat || v.category === filterCat;
        return matchSearch && matchCat;
      });
      const cats = getCategories();
      app.innerHTML = `
        <div class="page-header"><h1>Vocabulary</h1><p>${vocab.length} words total</p></div>
        <div class="vocab-controls">
          <input type="text" class="vocab-search" placeholder="Search..." value="${escapeHTML(search)}" id="vocab-search">
          <select class="vocab-filter" id="vocab-filter">
            <option value="">All categories</option>
            ${cats.map(c => `<option value="${escapeHTML(c)}" ${filterCat === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" id="add-vocab-btn">+ Add</button>
        </div>
        <div style="overflow-x:auto">
          <table class="vocab-table">
            <thead><tr><th>Chinese</th><th>Pinyin</th><th>Meaning</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(v => `
                <tr>
                  <td class="chinese-cell">${escapeHTML(v.chinese)}</td>
                  <td>${escapeHTML(v.pinyin)}</td>
                  <td>${escapeHTML(v.meaning)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary edit-vocab" data-id="${v.id}">Edit</button>
                    ${v.isCustom ? `<button class="btn btn-sm btn-error del-vocab" data-id="${v.id}" style="margin-left:4px">X</button>` : ''}
                  </td>
                </tr>
              `).join('')}
              ${filtered.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:20px">No words found</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      `;
      document.getElementById('vocab-search').addEventListener('input', e => { search = e.target.value; render(); });
      document.getElementById('vocab-filter').addEventListener('change', e => { filterCat = e.target.value; render(); });
      document.getElementById('add-vocab-btn').addEventListener('click', () => showModal());
      app.querySelectorAll('.edit-vocab').forEach(btn => {
        btn.addEventListener('click', () => { const entry = vocab.find(v => v.id === btn.dataset.id); if (entry) showModal(entry); });
      });
      app.querySelectorAll('.del-vocab').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this word?')) {
            await API.deleteVocabulary(btn.dataset.id);
            DB = await API.getDB();
            vocab = DB.vocabulary;
            render();
          }
        });
      });
    }

    function showModal(entry = null) {
      const isEdit = !!entry;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h2>${isEdit ? 'Edit Word' : 'Add New Word'}</h2>
          <div class="form-group"><label>Chinese Characters</label><input type="text" id="m-chinese" value="${isEdit ? escapeHTML(entry.chinese) : ''}" placeholder="e.g. 你好"></div>
          <div class="form-group"><label>Pinyin (with tone marks)</label><input type="text" id="m-pinyin" value="${isEdit ? escapeHTML(entry.pinyin) : ''}" placeholder="e.g. nǐhǎo"></div>
          <div class="form-group"><label>Meaning (Czech / English)</label><input type="text" id="m-meaning" value="${isEdit ? escapeHTML(entry.meaning) : ''}" placeholder="e.g. ahoj / hello"></div>
          <div class="form-group"><label>Category / Lesson</label><input type="text" id="m-category" value="${isEdit ? escapeHTML(entry.category) : 'custom'}" placeholder="e.g. lesson-1, textbook-ch3"></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="m-cancel">Cancel</button>
            <button class="btn btn-primary" id="m-save">${isEdit ? 'Save' : 'Add'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.getElementById('m-cancel').addEventListener('click', () => overlay.remove());
      document.getElementById('m-save').addEventListener('click', async () => {
        const chinese = document.getElementById('m-chinese').value.trim();
        const pinyin = document.getElementById('m-pinyin').value.trim();
        const meaning = document.getElementById('m-meaning').value.trim();
        const category = document.getElementById('m-category').value.trim() || 'custom';
        if (!chinese || !pinyin || !meaning) { alert('Please fill in Chinese, Pinyin, and Meaning.'); return; }
        if (isEdit) {
          await API.updateVocabulary(entry.id, { chinese, pinyin, meaning, category });
        } else {
          await API.addVocabulary({ chinese, pinyin, meaning, category });
        }
        DB = await API.getDB();
        vocab = DB.vocabulary;
        overlay.remove();
        render();
      });
    }

    render();
  }

  // ============================================================
  // VIEW: Calendar
  // ============================================================
  async function viewCalendar() {
    const progress = await loadProgress();
    const sessions = progress.sessions || [];

    let viewDate = new Date();
    let selectedDate = null;
    let calEvents = []; // expanded occurrences for current view

    const EVENT_TYPES = [
      { value: 'lesson',     label: 'Lesson' },
      { value: 'drill',      label: 'Drill' },
      { value: 'self-study', label: 'Self-study' },
      { value: 'homework',   label: 'Homework' },
      { value: 'other',      label: 'Other' }
    ];

    const REPEAT_OPTIONS = [
      { value: 'none',     label: 'No repeat' },
      { value: 'daily',    label: 'Daily' },
      { value: 'weekly',   label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 weeks' },
      { value: 'monthly',  label: 'Monthly' }
    ];

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    function dateKey(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function getMonthRange(year, month) {
      // Return range covering all visible days (prev month padding through next month padding)
      const first = new Date(year, month, 1);
      let startDay = first.getDay();
      startDay = startDay === 0 ? 6 : startDay - 1;
      const from = new Date(year, month, 1 - startDay);
      const last = new Date(year, month + 1, 0);
      const remaining = (7 - ((startDay + last.getDate()) % 7)) % 7;
      const to = new Date(year, month + 1, remaining);
      return { from: dateKey(from), to: dateKey(to) };
    }

    async function fetchEvents() {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const { from, to } = getMonthRange(year, month);
      calEvents = await API.getCalendar(from, to);
    }

    function getMonthDays(year, month) {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      let startDay = first.getDay();
      startDay = startDay === 0 ? 6 : startDay - 1;
      const days = [];
      for (let i = startDay - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), thisMonth: false });
      for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(year, month, i), thisMonth: true });
      while (days.length % 7 !== 0) { const d = new Date(year, month + 1, days.length - last.getDate() - startDay + 1); days.push({ date: d, thisMonth: false }); }
      return days;
    }

    function getEventsForDate(dk) { return calEvents.filter(e => e.date === dk); }
    function getSessionsForDate(dk) { return sessions.filter(s => s.date === dk); }

    function dotColorVar(type) {
      return type === 'lesson' ? '--red' : type === 'drill' ? '--success' : type === 'self-study' ? '--tone4' : type === 'homework' ? '--gold' : '--text-secondary';
    }

    async function render() {
      await fetchEvents();
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const days = getMonthDays(year, month);
      const todayKey = dateKey(new Date());

      app.innerHTML = `
        <div class="page-header"><h1>Calendar</h1><p>Track lessons, drills & study sessions</p></div>
        <div class="cal-legend">
          ${EVENT_TYPES.map(t => `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:var(${dotColorVar(t.value)})"></span>${t.label}</span>`).join('')}
          <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#9c27b0"></span>App session</span>
        </div>
        <div class="cal-nav">
          <button class="cal-nav-btn" id="cal-prev">&larr;</button>
          <span class="cal-month-label">${MONTHS[month]} ${year}</span>
          <button class="cal-nav-btn" id="cal-next">&rarr;</button>
        </div>
        <div class="cal-grid">
          ${DAYS.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
          ${days.map(d => {
            const dk = dateKey(d.date);
            const isToday = dk === todayKey;
            const isSelected = selectedDate === dk;
            const evts = getEventsForDate(dk);
            const sess = getSessionsForDate(dk);
            return `<div class="cal-day ${d.thisMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}" data-date="${dk}" style="${isSelected ? 'border-color:var(--gold);background:var(--gold-light)' : ''}">
              <div class="cal-day-num">${d.date.getDate()}</div>
              <div class="cal-dots">
                ${evts.map(e => `<span class="cal-dot ${e.type}" title="${escapeHTML(e.note || e.type)}"></span>`).join('')}
                ${sess.map(() => `<span class="cal-dot" style="background:#9c27b0" title="App session"></span>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <button class="btn btn-primary" id="cal-add-event">+ Add Event</button>
          <button class="btn btn-secondary" id="cal-add-recurring" style="margin-left:8px">+ Recurring</button>
          <button class="btn btn-secondary" id="cal-today" style="margin-left:8px">Today</button>
        </div>
        ${selectedDate ? renderDayDetail(selectedDate) : ''}
      `;

      document.getElementById('cal-prev').addEventListener('click', async () => { viewDate.setMonth(viewDate.getMonth() - 1); await render(); });
      document.getElementById('cal-next').addEventListener('click', async () => { viewDate.setMonth(viewDate.getMonth() + 1); await render(); });
      document.getElementById('cal-today').addEventListener('click', async () => { viewDate = new Date(); selectedDate = todayKey; await render(); });
      document.getElementById('cal-add-event').addEventListener('click', () => showEventModal(null, selectedDate || todayKey, false));
      document.getElementById('cal-add-recurring').addEventListener('click', () => showEventModal(null, selectedDate || todayKey, true));

      app.querySelectorAll('.cal-day[data-date]').forEach(el => {
        el.addEventListener('click', async () => { selectedDate = el.dataset.date; await render(); });
      });

      // Edit: for generated recurring occurrences, edit the source event
      app.querySelectorAll('.cal-edit-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sourceId = btn.dataset.sourceid;
          if (sourceId) {
            const rawEvents = await API.getCalendarRaw();
            const source = rawEvents.find(e => e.id === sourceId);
            if (source) showEventModal(source, null, !!source.repeat && source.repeat !== 'none');
          } else {
            const ev = calEvents.find(e => e.id === btn.dataset.id && !e._generated);
            if (ev) showEventModal(ev, null, false);
          }
        });
      });

      app.querySelectorAll('.cal-del-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sourceId = btn.dataset.sourceid;
          if (sourceId) {
            const choice = confirm('Delete ALL occurrences of this recurring event?\n\nOK = Delete all\nCancel = Keep');
            if (choice) {
              await API.deleteCalendarEvent(sourceId);
              await render();
            }
          } else {
            if (confirm('Delete this event?')) {
              await API.deleteCalendarEvent(btn.dataset.id);
              await render();
            }
          }
        });
      });
    }

    function renderDayDetail(dk) {
      const evts = getEventsForDate(dk);
      const sess = getSessionsForDate(dk);
      const d = new Date(dk + 'T00:00:00');
      const dayLabel = d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

      return `
        <div class="card">
          <div class="card-title">${dayLabel}</div>
          ${evts.length === 0 && sess.length === 0 ? '<p style="color:var(--text-secondary);font-size:14px">No events or sessions</p>' : ''}
          ${evts.map(e => {
            const isGenerated = e._generated;
            const sourceId = e._sourceId || '';
            const repeatLabel = isGenerated ? ' <span style="font-size:11px;color:var(--text-secondary)">(recurring)</span>' : '';
            return `
            <div class="cal-event-row">
              <span class="cal-event-type ${e.type}">${escapeHTML(e.type)}</span>
              <span class="cal-event-note">${escapeHTML(e.note || '')}${repeatLabel}${e.time ? ' <span style="font-size:12px;color:var(--text-secondary)">' + escapeHTML(e.time) + '</span>' : ''}</span>
              <div class="cal-event-actions">
                <button class="btn btn-sm btn-secondary cal-edit-event" data-id="${e.id}" data-sourceid="${sourceId}">Edit</button>
                <button class="btn btn-sm btn-error cal-del-event" data-id="${e.id}" data-sourceid="${sourceId}">X</button>
              </div>
            </div>`;
          }).join('')}
          ${sess.map(s => `
            <div class="cal-event-row">
              <span class="cal-dot" style="background:#9c27b0;width:10px;height:10px;border-radius:50%;display:inline-block"></span>
              <span class="cal-event-note">${escapeHTML(s.type)} — ${s.score}/${s.total} (${s.total > 0 ? Math.round(s.score/s.total*100) : 0}%)</span>
              <span style="font-size:12px;color:var(--text-secondary)">${escapeHTML(s.time || '')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    function showEventModal(event = null, defaultDate = null, showRecurrence = false) {
      const isEdit = !!event;
      const hasRepeat = isEdit && event.repeat && event.repeat !== 'none';

      // For recurring events, figure out the day name from the start date
      const startDateVal = isEdit ? event.date : (defaultDate || dateKey(new Date()));
      const startDayName = DAY_NAMES[new Date(startDateVal + 'T00:00:00').getDay()];

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h2>${isEdit ? (hasRepeat ? 'Edit Recurring Event' : 'Edit Event') : (showRecurrence ? 'Add Recurring Event' : 'Add Event')}</h2>
          <div class="form-group">
            <label>${showRecurrence || hasRepeat ? 'Start Date' : 'Date'}</label>
            <input type="date" id="ev-date" value="${startDateVal}">
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="ev-type">
              ${EVENT_TYPES.map(t => `<option value="${t.value}" ${isEdit && event.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Note</label>
            <input type="text" id="ev-note" value="${isEdit ? escapeHTML(event.note || '') : ''}" placeholder="e.g. Chinese lesson with Barbora">
          </div>
          <div class="form-group">
            <label>Time (optional)</label>
            <input type="time" id="ev-time" value="${isEdit ? (event.time || '') : ''}">
          </div>
          <div id="recurrence-section" style="display:${showRecurrence || hasRepeat ? 'block' : 'none'}">
            <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
            <div class="form-group">
              <label>Repeat</label>
              <select id="ev-repeat">
                ${REPEAT_OPTIONS.map(r => `<option value="${r.value}" ${isEdit && event.repeat === r.value ? 'selected' : ((!isEdit && showRecurrence && r.value === 'weekly') ? 'selected' : '')}>${r.label}</option>`).join('')}
              </select>
              <div id="ev-repeat-hint" style="font-size:12px;color:var(--text-secondary);margin-top:4px">
                ${showRecurrence ? `Every ${startDayName}` : ''}
              </div>
            </div>
            <div class="form-group">
              <label>Until (end date)</label>
              <input type="date" id="ev-repeat-end" value="${isEdit && event.repeatEnd ? event.repeatEnd : ''}">
            </div>
          </div>
          ${!showRecurrence && !hasRepeat ? '<div style="margin-top:8px"><a href="#" id="ev-show-recurrence" style="font-size:13px;color:var(--red)">+ Make recurring</a></div>' : ''}
          <div class="modal-actions">
            <button class="btn btn-secondary" id="ev-cancel">Cancel</button>
            <button class="btn btn-primary" id="ev-save">${isEdit ? 'Save' : 'Add'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Toggle recurrence section
      const showRecLink = overlay.querySelector('#ev-show-recurrence');
      if (showRecLink) {
        showRecLink.addEventListener('click', (e) => {
          e.preventDefault();
          overlay.querySelector('#recurrence-section').style.display = 'block';
          showRecLink.style.display = 'none';
        });
      }

      // Update hint when date changes
      const dateInput = overlay.querySelector('#ev-date');
      const repeatSelect = overlay.querySelector('#ev-repeat');
      const hintEl = overlay.querySelector('#ev-repeat-hint');
      function updateHint() {
        const d = dateInput.value;
        const r = repeatSelect.value;
        if (!d || r === 'none') { hintEl.textContent = ''; return; }
        const dayName = DAY_NAMES[new Date(d + 'T00:00:00').getDay()];
        if (r === 'weekly') hintEl.textContent = `Every ${dayName}`;
        else if (r === 'biweekly') hintEl.textContent = `Every other ${dayName}`;
        else if (r === 'daily') hintEl.textContent = 'Every day';
        else if (r === 'monthly') hintEl.textContent = `Monthly on day ${new Date(d + 'T00:00:00').getDate()}`;
      }
      dateInput.addEventListener('change', updateHint);
      repeatSelect.addEventListener('change', updateHint);

      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#ev-cancel').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#ev-save').addEventListener('click', async () => {
        const evDate = dateInput.value;
        const type = overlay.querySelector('#ev-type').value;
        const note = overlay.querySelector('#ev-note').value.trim();
        const time = overlay.querySelector('#ev-time').value;
        const repeat = repeatSelect ? repeatSelect.value : 'none';
        const repeatEnd = overlay.querySelector('#ev-repeat-end') ? overlay.querySelector('#ev-repeat-end').value : '';

        if (!evDate) { alert('Please select a date.'); return; }
        if (repeat !== 'none' && !repeatEnd) { alert('Please set an end date for recurring events.'); return; }

        const payload = { date: evDate, type, note, time, repeat: repeat || 'none' };
        if (repeat !== 'none' && repeatEnd) payload.repeatEnd = repeatEnd;

        if (isEdit) {
          await API.updateCalendarEvent(event.id, payload);
        } else {
          await API.addCalendarEvent(payload);
        }
        selectedDate = evDate;
        overlay.remove();
        await render();
      });
    }

    await render();
  }

  // ============================================================
  // VIEW: Sounds (Mouth Mechanics / Articulation Reference)
  // ============================================================
  function viewSounds() {
    const families = {
      retroflex: {
        label: 'Retroflex',
        sounds: [
          { pinyin:'zh', ipa:'ʈʂ', zone:'post-alv', tonguePart:'tip', tongueDesc:'Tip curls back to post-alveolar ridge. No teeth contact.', lips:'neutral', voiced:false, aspirated:false, manner:'affricate', trap:'NOT Czech č — tip must curl BACKWARD. Czech č contacts forward at alveolar ridge.', anchor:null, drill:'Whisper "dr" as in drum. Freeze at the r-position. Close and release from there.' },
          { pinyin:'ch', ipa:'ʈʂʰ', zone:'post-alv', tonguePart:'tip', tongueDesc:'Same curled-back tip as zh, released with a burst of air.', lips:'neutral', voiced:false, aspirated:true, manner:'affricate', trap:'NOT Czech č. Retroflex position + strong aspiration. Two things at once.', anchor:null, drill:'Achieve zh. Now release with a strong puff — hold paper in front: it must move.' },
          { pinyin:'sh', ipa:'ʂ', zone:'post-alv', tonguePart:'tip', tongueDesc:'Tip curls back, held near (not touching) post-alveolar zone. Steady friction.', lips:'slightly rounded', voiced:false, aspirated:false, manner:'fricative', trap:'NOT Czech š [ʃ]. Same family of sound but tongue curls BACK. Czech š is a forward contact.', anchor:null, drill:'Curl tongue tip back and up until you feel friction without full contact. Lips gently rounded.' },
          { pinyin:'r', ipa:'ɻ', zone:'post-alv', tonguePart:'tip', tongueDesc:'Tip curls back, voiced, tongue relaxed. No trill — no vibration at all.', lips:'slightly rounded', voiced:true, aspirated:false, manner:'approximant', trap:'NO Czech equivalent. NOT a trill. NOT Czech r [r]. Hold sh and add voice — that is all.', anchor:null, drill:'Hold sh [ʂ]. Add voicing from your throat (a buzz). Relax the airflow. Done.' },
        ]
      },
      palatal: {
        label: 'Palatal',
        sounds: [
          { pinyin:'j', ipa:'tɕ', zone:'palatal', tonguePart:'blade', tongueDesc:'Blade (just behind tip) contacts hard palate. Lips spread wide like a smile.', lips:'spread — smile wide', voiced:false, aspirated:false, manner:'affricate', trap:'Between Czech č and c in space. Must be palatal (not alveolar). Spread lips is not optional.', anchor:null, drill:'Wide smile, teeth showing. Say Czech c [ts] with this smile. Move contact slightly back.' },
          { pinyin:'q', ipa:'tɕʰ', zone:'palatal', tonguePart:'blade', tongueDesc:'Identical blade position to j, released with strong aspiration.', lips:'spread — smile wide', voiced:false, aspirated:true, manner:'affricate', trap:'No Czech equivalent. Build from j — add a strong air burst after the release.', anchor:null, drill:'Master j first. Add aspiration: j + puff. Paper in front must flutter clearly.' },
          { pinyin:'x', ipa:'ɕ', zone:'palatal', tonguePart:'blade', tongueDesc:'Blade near (not touching) hard palate. High front hiss. Continuous friction.', lips:'spread — smile wide', voiced:false, aspirated:false, manner:'fricative', trap:'NOT Czech s (too far forward). NOT Czech š (too far back). This is a palatal hiss — in between.', anchor:null, drill:'Wide smile. Push air through with a high-pitched hiss. Blade approaches but does not touch palate.' },
        ]
      },
      sibilant: {
        label: 'Sibilant',
        sounds: [
          { pinyin:'z', ipa:'ts', zone:'alveolar', tonguePart:'tip', tongueDesc:'Tip contacts alveolar ridge. Unaspirated stop-fricative. No voicing.', lips:'neutral', voiced:false, aspirated:false, manner:'affricate', trap:'NOT Czech z [ʒ] (voiced fricative). Completely different. This is an affricate — Czech c.', anchor:'SAME as Czech c [ts] — you own this position.', drill:'Say Czech c quietly. Feel tip at alveolar ridge. No voicing. That is Mandarin z.' },
          { pinyin:'c', ipa:'tsʰ', zone:'alveolar', tonguePart:'tip', tongueDesc:'Same tip position as z, but with a strong air burst immediately after the release.', lips:'neutral', voiced:false, aspirated:true, manner:'affricate', trap:'Czech c exists but is NOT aspirated. You must add a burst — Czech mouth alone is not enough.', anchor:'Czech c [ts] + aspiration burst', drill:'Say Czech c. Now add a clear puff of air after the release. Paper in front must move.' },
          { pinyin:'s', ipa:'s', zone:'alveolar', tonguePart:'tip', tongueDesc:'Tip near alveolar ridge, continuous friction. Identical to Czech s.', lips:'neutral', voiced:false, aspirated:false, manner:'fricative', trap:null, anchor:'IDENTICAL to Czech s [s] — no modification needed. You fully own this sound.', drill:'No drill needed. This is pure Czech s. The one Mandarin initial your mouth already knows.' },
        ]
      },
      special: {
        label: 'Special',
        sounds: [
          { pinyin:'ü', ipa:'y', zone:'palatal', tonguePart:'body', tongueDesc:'Tongue body high and FORWARD (as in Czech i). Lips simultaneously ROUNDED into tight circle.', lips:'tightly rounded (ü)', voiced:true, aspirated:false, manner:'vowel', trap:'NOT Czech ú/ů — those are back-rounded. This is FORWARD tongue + ROUNDED lips. Czech never combines these.', anchor:null, drill:'Say Czech i (ee). Hold tongue exactly there — do not move it. Now slowly round lips into a tight circle.' },
          { pinyin:'-n', ipa:'n̪', zone:'alveolar', tonguePart:'tip', tongueDesc:'Tip touches alveolar ridge. Nasal resonance. Do not add an extra consonant release.', lips:'neutral', voiced:true, aspirated:false, manner:'nasal', trap:null, anchor:'Same position as Czech n. Focus on the VOWEL before it — -an, -en, -in are three distinct sounds.', drill:'Record yourself. -an / -en / -in must sound clearly different. The n itself is Czech n.' },
          { pinyin:'-ng', ipa:'ŋ', zone:'velar', tonguePart:'back (body)', tongueDesc:'Back of tongue presses up to velum (soft palate). Nasal resonance held at the throat.', lips:'neutral', voiced:true, aspirated:false, manner:'nasal', trap:'Do NOT release a [g] at the end. Hold the nasal resonance and stop — no consonant release.', anchor:'The nasal resonance in Czech banka/tango — the ng-resonance before k.', drill:'Say "song" and stop BEFORE the g. Freeze at that nasal resonance. That is -ng [ŋ].' },
        ]
      }
    };

    const zones = ['lips','alveolar','post-alv','palatal','velar'];
    const tParts = ['tip','blade','body','back (body)'];
    const manners = ['affricate','fricative','nasal','approximant','vowel'];
    let curFamily = 'retroflex';
    let curSound = families.retroflex.sounds[0];

    function zoneCoords(z) {
      // px,py = palate contact point; tx,ty = tongue contact point
      return {
        'lips':    {px:14,py:58, tx:24,ty:74},
        'alveolar':{px:38,py:22, tx:42,ty:66},
        'post-alv':{px:64,py:12, tx:62,ty:60},
        'palatal': {px:108,py:7, tx:100,ty:57},
        'velar':   {px:148,py:22, tx:136,ty:60}
      }[z] || {px:108,py:7,tx:100,ty:57};
    }

    function mouthSvg(s) {
      const zc = zoneCoords(s.zone);
      const ic = 'var(--accent)';
      const bc = 'var(--text-secondary)';
      const tc = 'var(--border)';
      const bg = 'var(--accent-light)';
      const lb = 'var(--text-secondary)'; // label color
      const lbHi = 'var(--accent)'; // highlighted label

      // Upper palate segments (roof of mouth)
      const segs = [
        { z:'lips',     d:'M 10,78 L 10,52 L 18,38' },
        { z:'alveolar', d:'M 18,38 L 30,26 L 46,18' },
        { z:'post-alv', d:'M 46,18 Q 62,10 84,7' },
        { z:'palatal',  d:'M 84,7 Q 108,5 130,10' },
        { z:'velar',    d:'M 130,10 Q 152,16 168,34 L 176,52' },
      ];
      const segPaths = segs.map(seg => {
        const active = s.zone === seg.z;
        return `<path d="${seg.d}" fill="none" stroke="${active ? ic : tc}" stroke-width="${active ? 3.5 : 1.5}" stroke-linecap="round"/>`;
      }).join('');

      // Teeth (two small lines behind lips)
      const teeth = `
        <line x1="22" y1="32" x2="26" y2="42" stroke="${bc}" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="28" y1="28" x2="32" y2="38" stroke="${bc}" stroke-width="1.5" stroke-linecap="round"/>`;

      // Lower jaw / floor of mouth
      const jaw = `<path d="M 10,78 Q 90,94 176,78" fill="none" stroke="${bc}" stroke-width="1.5"/>`;

      // Dynamic tongue shape per sound type
      const tp = s.tonguePart;
      const tipActive = tp === 'tip';
      const bladeActive = tp === 'blade';
      const bodyActive = tp === 'body';
      const backActive = tp === 'back (body)' || tp === 'back';

      // Each tongue shape: path for outline, division x-coords, label positions
      // Shapes are anatomically motivated per articulation type
      const tongueShapes = {
        // Retroflex: tip curls UP and BACK toward post-alveolar ridge
        // Body stays low, tip dramatically raised
        retroflex: {
          path: 'M 26,78 Q 32,74 40,72 Q 50,70 56,66 Q 60,58 64,48 Q 66,40 62,36 Q 58,34 54,38 Q 48,46 50,56 Q 56,62 72,64 Q 100,62 130,62 Q 150,66 168,78 Z',
          divs: [{x:50,y1:56,y2:78},{x:72,y1:64,y2:78},{x:120,y1:62,y2:78}],
          labels: [{x:38,y:88,part:'tip'},{x:62,y:88,part:'blade'},{x:96,y:88,part:'body'},{x:140,y:88,part:'back'}],
        },
        // Palatal: blade/body rises HIGH to palate, tip stays DOWN behind lower teeth
        palatal: {
          path: 'M 26,78 Q 30,76 34,76 L 38,78 Q 42,76 48,68 Q 58,52 76,40 Q 90,32 108,30 Q 120,32 130,40 Q 142,52 156,66 L 168,78 Z',
          divs: [{x:44,y1:70,y2:78},{x:72,y1:44,y2:78},{x:125,y1:36,y2:78}],
          labels: [{x:36,y:88,part:'tip'},{x:58,y:88,part:'blade'},{x:98,y:88,part:'body'},{x:144,y:88,part:'back'}],
        },
        // Sibilant: tip reaches up to alveolar ridge, rest relatively flat
        alveolar: {
          path: 'M 26,78 Q 32,72 38,64 Q 42,52 44,44 Q 46,40 42,38 Q 38,40 36,48 Q 40,56 52,62 Q 72,60 100,58 Q 130,58 156,66 L 168,78 Z',
          divs: [{x:46,y1:56,y2:78},{x:72,y1:60,y2:78},{x:120,y1:58,y2:78}],
          labels: [{x:36,y:88,part:'tip'},{x:58,y:88,part:'blade'},{x:96,y:88,part:'body'},{x:140,y:88,part:'back'}],
        },
        // ü vowel: body high and FORWARD (like i), lips rounded
        palatal_vowel: {
          path: 'M 26,78 Q 30,74 36,72 Q 48,62 64,46 Q 78,36 96,32 Q 110,34 124,42 Q 140,54 156,68 L 168,78 Z',
          divs: [{x:44,y1:64,y2:78},{x:72,y1:44,y2:78},{x:120,y1:40,y2:78}],
          labels: [{x:36,y:88,part:'tip'},{x:58,y:88,part:'blade'},{x:96,y:88,part:'body'},{x:140,y:88,part:'back'}],
        },
        // Velar nasal (-ng): back of tongue rises to velum
        velar: {
          path: 'M 26,78 Q 34,72 44,68 Q 60,62 80,58 Q 100,52 118,42 Q 132,32 144,26 Q 150,24 152,28 Q 150,36 142,44 Q 134,50 126,56 Q 140,62 156,68 L 168,78 Z',
          divs: [{x:44,y1:68,y2:78},{x:72,y1:60,y2:78},{x:120,y1:46,y2:78}],
          labels: [{x:36,y:88,part:'tip'},{x:58,y:88,part:'blade'},{x:96,y:88,part:'body'},{x:140,y:88,part:'back'}],
        },
      };

      // Pick tongue shape based on zone + manner
      let shapeKey = s.zone;
      if (s.zone === 'post-alv') shapeKey = 'retroflex';
      else if (s.zone === 'palatal' && s.manner === 'vowel') shapeKey = 'palatal_vowel';
      else if (s.zone === 'palatal') shapeKey = 'palatal';
      else if (s.zone === 'alveolar') shapeKey = 'alveolar';
      else if (s.zone === 'velar') shapeKey = 'velar';
      else shapeKey = 'alveolar'; // fallback
      const shape = tongueShapes[shapeKey];

      // Tongue outline
      const tongue = `
        <path d="${shape.path}"
              fill="${bg}" fill-opacity="0.2" stroke="${ic}" stroke-width="1" stroke-opacity="0.6"/>`;

      // Tongue division lines
      const tDiv = shape.divs.map(d =>
        `<line x1="${d.x}" y1="${d.y1}" x2="${d.x}" y2="${d.y2}" stroke="${tc}" stroke-width="0.5" stroke-dasharray="2 2"/>`
      ).join('');

      // Tongue part labels
      const tLabels = shape.labels.map(l => {
        const active = (l.part === 'tip' && tipActive) || (l.part === 'blade' && bladeActive) ||
                       (l.part === 'body' && bodyActive) || (l.part === 'back' && backActive);
        return `<text x="${l.x}" y="${l.y}" style="font-size:6.5px;fill:${active ? lbHi : lb};font-family:system-ui;font-weight:${active?'700':'400'};text-anchor:middle;">${l.part}</text>`;
      }).join('');

      // Highlight active tongue part — approximate regions between dividers
      const partHL = (() => {
        const d = shape.divs;
        // We build overlay paths based on divider positions
        if (tipActive) return `<rect x="26" y="${d[0].y1}" width="${d[0].x-26}" height="${78-d[0].y1}" fill="${ic}" opacity="0.2" rx="2"/>`;
        if (bladeActive) return `<rect x="${d[0].x}" y="${d[1].y1}" width="${d[1].x-d[0].x}" height="${78-d[1].y1}" fill="${ic}" opacity="0.2" rx="2"/>`;
        if (bodyActive) return `<rect x="${d[1].x}" y="${d[2].y1}" width="${d[2].x-d[1].x}" height="${78-d[2].y1}" fill="${ic}" opacity="0.2" rx="2"/>`;
        if (backActive) return `<rect x="${d[2].x}" y="${d[2].y1}" width="${168-d[2].x}" height="${78-d[2].y1}" fill="${ic}" opacity="0.2" rx="2"/>`;
        return '';
      })();

      // Anatomical region labels along the palate
      const regionLabels = [
        { z:'lips',     x:4,  y:48, anchor:'start',  label:'Rty' },
        { z:'alveolar', x:32, y:14, anchor:'middle', label:'Dásně' },
        { z:'post-alv', x:64, y:4,  anchor:'middle', label:'Post-alv.' },
        { z:'palatal',  x:108,y:3,  anchor:'middle', label:'Patro' },
        { z:'velar',    x:160,y:26, anchor:'middle', label:'Velum' },
      ];
      const rLabels = regionLabels.map(r => {
        const active = s.zone === r.z;
        return `<text x="${r.x}" y="${r.y}" style="font-size:6.5px;fill:${active ? lbHi : lb};font-family:system-ui;font-weight:${active?'700':'400'};text-anchor:${r.anchor};opacity:${active?1:0.7};">${r.label}</text>`;
      }).join('');

      // Contact point indicator — arrow from tongue to palate
      const contactDot = `
        <circle cx="${zc.px}" cy="${zc.py}" r="4.5" fill="${ic}" opacity="0.9"/>
        <circle cx="${zc.tx}" cy="${zc.ty}" r="3.5" fill="${bg}" stroke="${ic}" stroke-width="1" opacity="0.8"/>
        <line x1="${zc.tx}" y1="${zc.ty-3}" x2="${zc.px}" y2="${zc.py+5}" stroke="${ic}" stroke-width="1" stroke-dasharray="3 2" opacity="0.7"/>`;

      // Lip shape indicator on the left side
      const lipShapes = {
        'neutral':               `<ellipse cx="6" cy="68" rx="3" ry="6" fill="none" stroke="${bc}" stroke-width="1.2"/>`,
        'slightly rounded':      `<ellipse cx="6" cy="68" rx="4" ry="5" fill="${bg}" fill-opacity="0.3" stroke="${ic}" stroke-width="1.2"/>`,
        'spread — smile wide':   `<path d="M 2,66 Q 6,72 10,66" fill="none" stroke="${ic}" stroke-width="1.2"/>`,
        'tightly rounded (ü)':   `<circle cx="6" cy="68" r="2.5" fill="${bg}" fill-opacity="0.4" stroke="${ic}" stroke-width="1.5"/>`,
      };
      const lipShape = lipShapes[s.lips] || lipShapes['neutral'];

      // Nasal passage hint (for nasals) — velum lowered, air through nose
      const nasal = s.manner === 'nasal' ? `
        <path d="M 130,10 Q 140,2 155,0 Q 168,0 176,8" fill="none" stroke="${ic}" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.6"/>
        <path d="M 166,2 L 172,6 L 160,5" fill="none" stroke="${ic}" stroke-width="0.8" opacity="0.6"/>
        <text x="156" y="-2" style="font-size:6px;fill:${ic};font-family:system-ui;text-anchor:middle;opacity:0.8;">nos</text>` : '';

      // Airflow arrow for aspirated sounds
      const airflow = s.aspirated ? `
        <defs><marker id="arrowhead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="${ic}"/></marker></defs>
        <path d="M 12,68 L -2,68" fill="none" stroke="${ic}" stroke-width="1.5" marker-end="url(#arrowhead)"/>
        <text x="-2" y="64" style="font-size:5.5px;fill:${ic};font-family:system-ui;text-anchor:start;">vzduch</text>` : '';

      return `<svg viewBox="-8 -6 200 104" width="100%" style="display:block;">
        ${segPaths}
        ${teeth}
        ${jaw}
        ${tongue}
        ${tDiv}
        ${partHL}
        ${contactDot}
        ${lipShape}
        ${rLabels}
        ${tLabels}
        ${nasal}
        ${airflow}
      </svg>`;
    }

    function renderFamilyTabs() {
      document.getElementById('ftabs').innerHTML = Object.entries(families).map(([k,v]) =>
        `<button class="ft${k===curFamily?' on':''}">${v.label}</button>`).join('');
      document.querySelectorAll('#ftabs .ft').forEach((btn, idx) => {
        const key = Object.keys(families)[idx];
        btn.addEventListener('click', () => setFamily(key));
      });
    }

    function renderPills() {
      document.getElementById('spills').innerHTML = families[curFamily].sounds.map((s,i) => {
        const on = curSound && s.pinyin===curSound.pinyin;
        return `<button class="sp${on?' on':''}"><span class="py">${s.pinyin}</span><span class="ip">[${s.ipa}]</span></button>`;
      }).join('');
      document.querySelectorAll('#spills .sp').forEach((btn, idx) => {
        btn.addEventListener('click', () => setSound(idx));
      });
    }

    function renderDetail(s) {
      const det = document.getElementById('det');
      if (!s) { det.innerHTML='<p class="empty">Select a sound above</p>'; return; }
      let h = `<div class="hero"><span class="ipa-h">${s.ipa}</span><span class="py-h">${s.pinyin}</span></div>
        <div class="rows">
          <div class="mr"><span class="ml">Tongue part</span><span class="mv">${s.tonguePart}</span></div>
          <div class="mr"><span class="ml">Position</span><span class="mv">${s.tongueDesc}</span></div>
          <div class="mr"><span class="ml">Lips</span><span class="mv">${s.lips}</span></div>
          <div class="mr"><span class="ml">Voiced</span><span class="mv">${s.voiced ? 'Yes — activate vocal cords' : 'No — whisper mode'}</span></div>
          <div class="mr"><span class="ml">Aspirated</span><span class="mv">${s.aspirated ? 'Yes — burst of air after release' : 'No — no air burst'}</span></div>
          <div class="mr"><span class="ml">Sound type</span><span class="mv">${s.manner}</span></div>
        </div><div class="sep"></div>`;
      if (s.trap) h += `<div class="czbox trap"><div class="czl">Czech trap</div><div class="czt">${s.trap}</div></div>`;
      if (s.anchor) h += `<div class="czbox anch"><div class="czl">Czech anchor</div><div class="czt">${s.anchor}</div></div>`;
      h += `<div class="drillbox"><div class="dlbl">Drill cue</div><div class="dtxt">${s.drill}</div></div>`;
      det.innerHTML = h;
    }

    function renderVis(s) {
      const vis = document.getElementById('vis');
      if (!s) { vis.innerHTML=''; return; }
      const zsegs = zones.map(z=>`<div class="zseg${s.zone===z?' on':''}">${z}</div>`).join('');
      const tpRows = tParts.map(p=>`<div class="tprow"><div class="tpdot${(s.tonguePart===p||s.tonguePart.startsWith(p))?' on':''}"></div>${p}</div>`).join('');
      const chips = [...manners.map(m=>`<span class="chip${s.manner===m?' on':''}">${m}</span>`),
        `<span class="chip${s.aspirated?' on':''}">aspirated</span>`,
        `<span class="chip${s.voiced?' on':''}">voiced</span>`].join('');
      vis.innerHTML = `
        <div class="vcard"><div class="vcl">Mouth cross-section</div>${mouthSvg(s)}</div>
        <div class="vcard">
          <div class="vcl">Articulation zone</div>
          <div class="zbar">${zsegs}</div>
          <div class="tparts">${tpRows}</div>
          <div class="chips">${chips}</div>
        </div>`;
    }

    function setFamily(f) {
      curFamily = f;
      curSound = families[f].sounds[0];
      renderFamilyTabs(); renderPills(); renderDetail(curSound); renderVis(curSound);
    }

    function setSound(i) {
      curSound = families[curFamily].sounds[i];
      renderPills(); renderDetail(curSound); renderVis(curSound);
    }

    // Render the shell
    app.innerHTML = `
      <div class="page-header"><h1>Mouth Mechanics</h1><p style="color:var(--text-secondary);font-size:14px">Interactive articulation reference for Mandarin sounds</p></div>
      <div class="mm-wrap">
        <div class="ftabs" id="ftabs"></div>
        <div class="spills" id="spills"></div>
        <div class="panel">
          <div class="det" id="det"><p class="empty">Select a sound above</p></div>
          <div class="vis" id="vis"></div>
        </div>
      </div>
    `;

    // Initialize
    setFamily('retroflex');
  }

  // ============================================================
  // VIEW: Progress & Stats
  // ============================================================
  async function viewProgress() {
    const progress = await loadProgress();
    const vocab = DB.vocabulary;
    const totalVocab = vocab.length;
    const reviewed = vocab.filter(v => { const srs = getVocabSRS(progress, v.id); return srs.correctCount > 0 || srs.incorrectCount > 0; }).length;
    const mastered = vocab.filter(v => getVocabSRS(progress, v.id).streak >= 3).length;
    const pinyinTotal = progress.pinyin.initialsCorrect + progress.pinyin.initialsIncorrect + progress.pinyin.tonesCorrect + progress.pinyin.tonesIncorrect;
    const pinyinCorrect = progress.pinyin.initialsCorrect + progress.pinyin.tonesCorrect;
    const pinyinPct = pinyinTotal > 0 ? Math.round(pinyinCorrect / pinyinTotal * 100) : 0;
    const vocabPct = totalVocab > 0 ? Math.round(mastered / totalVocab * 100) : 0;
    const reviewedPct = totalVocab > 0 ? Math.round(reviewed / totalVocab * 100) : 0;

    app.innerHTML = `
      <div class="page-header">
        <h1>Progress & Stats</h1>
        ${progress.streakDays > 0 ? `<div class="streak-badge" style="margin-top:8px">&#x1F525; ${progress.streakDays} day streak</div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">Vocabulary Mastery</div>
        <p style="font-size:14px;color:var(--text-secondary)">${mastered} / ${totalVocab} words mastered (streak >= 3)</p>
        <div class="progress-bar-container"><div class="progress-bar-fill green" style="width:${vocabPct}%"></div></div>
        <p style="font-size:14px;color:var(--text-secondary);margin-top:8px">${reviewed} / ${totalVocab} words reviewed</p>
        <div class="progress-bar-container"><div class="progress-bar-fill gold" style="width:${reviewedPct}%"></div></div>
      </div>
      <div class="card">
        <div class="card-title">Pinyin Drills</div>
        <p style="font-size:14px;color:var(--text-secondary)">${pinyinCorrect} / ${pinyinTotal} correct (${pinyinPct}%)</p>
        <div class="progress-bar-container"><div class="progress-bar-fill ${pinyinPct >= 70 ? 'green' : pinyinPct >= 40 ? 'gold' : 'red'}" style="width:${pinyinPct}%"></div></div>
        <div style="margin-top:12px">
          <p style="font-size:13px;color:var(--text-secondary)">Tones: ${progress.pinyin.tonesCorrect} correct, ${progress.pinyin.tonesIncorrect} incorrect</p>
          <p style="font-size:13px;color:var(--text-secondary)">Initials: ${progress.pinyin.initialsCorrect} correct, ${progress.pinyin.initialsIncorrect} incorrect</p>
        </div>
        ${progress.pinyin.weakTones.length > 0 ? `<div style="margin-top:12px"><p style="font-size:13px;font-weight:600">Weak tones:</p><div class="weak-items">${progress.pinyin.weakTones.map(t => `<span class="weak-tag">Tone ${t}</span>`).join('')}</div></div>` : ''}
        ${progress.pinyin.weakInitials.length > 0 ? `<div style="margin-top:12px"><p style="font-size:13px;font-weight:600">Weak initials:</p><div class="weak-items">${progress.pinyin.weakInitials.map(i => `<span class="weak-tag">${escapeHTML(i)}</span>`).join('')}</div></div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">Pronunciation Pairs</div>
        ${Object.keys(progress.pairs).length > 0 ? `<ul class="session-list">${Object.entries(progress.pairs).map(([key, val]) => {
          const total = val.correctCount + val.incorrectCount;
          const pct = total > 0 ? Math.round(val.correctCount / total * 100) : 0;
          return `<li class="session-item"><span class="session-type">${escapeHTML(key.replace('|', ' vs '))}</span><span class="session-score">${pct}% (${val.correctCount}/${total})</span></li>`;
        }).join('')}</ul>` : '<p style="color:var(--text-secondary);font-size:14px">No pair drills yet</p>'}
      </div>
      <div class="card">
        <div class="card-title">Recent Sessions</div>
        ${progress.sessions.length > 0 ? `<ul class="session-list">${progress.sessions.slice(0, 20).map(s => `
          <li class="session-item">
            <div><span class="session-type">${escapeHTML(s.type)}</span><br><small style="color:var(--text-secondary)">${escapeHTML(s.date)} ${escapeHTML(s.time || '')}</small></div>
            <span class="session-score">${s.score}/${s.total} (${s.total > 0 ? Math.round(s.score/s.total*100) : 0}%)</span>
          </li>`).join('')}</ul>` : '<p style="color:var(--text-secondary);font-size:14px">No sessions yet</p>'}
      </div>
      <div class="card" style="text-align:center">
        <button class="btn btn-error btn-sm" id="reset-progress">Reset All Progress</button>
      </div>
    `;
    document.getElementById('reset-progress').addEventListener('click', async () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        PROGRESS = { vocabulary: {}, pinyin: { initialsCorrect: 0, initialsIncorrect: 0, tonesCorrect: 0, tonesIncorrect: 0, weakInitials: [], weakTones: [] }, pairs: {}, sessions: [], streakDays: 0, lastStudyDate: null };
        await saveProgress(PROGRESS);
        viewProgress();
      }
    });
  }

})();

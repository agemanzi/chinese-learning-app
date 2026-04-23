// Per-word stats + don't-repeat queue (single-user, localStorage)
const STATS = {
  KEY: 'hsk1_stats_v1',
  data: null,
  _saveTimer: null,

  load() {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch {
      this.data = {};
    }
    this.data.words = this.data.words || {};
    this.data.syllables = this.data.syllables || {};
    this.data.sessions = this.data.sessions || [];
    // Flush pending writes before tab closes
    window.addEventListener('pagehide', () => this._flush());
    return this.data;
  },

  // Throttled save — writes at most once per 500ms
  save() {
    if (!this.data) return;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._flush();
    }, 500);
  },

  _flush() {
    if (!this.data) return;
    this._saveTimer = null;
    localStorage.setItem(this.KEY, JSON.stringify(this.data));
  },

  recordWord(char, correct) {
    const d = this.load();
    const s = d.words[char] = d.words[char] || { seen: 0, correct: 0, wrong: 0, lastSeen: 0 };
    s.seen++;
    if (correct) s.correct++; else s.wrong++;
    s.lastSeen = Date.now();
    // Update spaced repetition schedule
    if (typeof SRS !== 'undefined') Object.assign(s, SRS.update(s, correct));
    this.save();
    if (typeof SYNC !== 'undefined') SYNC.schedulePush();
  },

  recordSyllable(key, correct) {
    const d = this.load();
    const s = d.syllables[key] = d.syllables[key] || { seen: 0, correct: 0, wrong: 0 };
    s.seen++;
    if (correct) s.correct++; else s.wrong++;
    this.save();
    if (typeof SYNC !== 'undefined') SYNC.schedulePush();
  },

  recordSession(drill, score, total) {
    const d = this.load();
    d.sessions.push({ drill, score, total, at: Date.now() });
    if (d.sessions.length > 200) d.sessions = d.sessions.slice(-200);
    this.save();
    if (typeof SYNC !== 'undefined') SYNC.schedulePush();
  },

  getWordStats(char) {
    return this.load().words[char] || { seen: 0, correct: 0, wrong: 0 };
  },

  accuracy(char) {
    const s = this.getWordStats(char);
    return s.seen > 0 ? Math.round(s.correct / s.seen * 100) : null;
  },
};

// Per-lesson mastery stats — used by lessons.js progression hub
function lessonProgress(lessonNum) {
  const lesson = (DATA.tutorLessons || []).find(l => l.num === lessonNum);
  if (!lesson) return { total: 0, mastered: 0, seen: 0, due: 0 };
  const stats = STATS.load();
  const words = lesson.chars_hsk || [];
  const now = Date.now();
  return {
    total:    words.length,
    mastered: words.filter(w => (stats.words[w]?.srs_interval || 0) >= 7).length,
    seen:     words.filter(w =>  stats.words[w]?.seen > 0).length,
    due:      words.filter(w => (stats.words[w]?.srs_due || 0) <= now && stats.words[w]?.seen > 0).length,
  };
}

// Shared end-of-drill summary UI
function renderDrillSummary({ drillName, score, total, onRestart, showRecentRuns, runHistory }) {
  STATS.recordSession(drillName, score, total);
  const pct = total > 0 ? Math.round(score / total * 100) : 0;
  const grade = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  const msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Nice work!' : pct >= 50 ? 'Keep going' : 'Tricky — try again';

  // Optional: run-by-run breakdown for this session (passed by caller)
  const runHistoryHtml = (typeof renderRunHistory === 'function' && runHistory && runHistory.length)
    ? renderRunHistory(runHistory)
    : '';

  // Optional: cross-run stats — filter past sessions of this drill (family match before " · ")
  let recentHtml = '';
  if (showRecentRuns) {
    const family = drillName.split(' · ')[0];
    const sessions = (STATS.load().sessions || [])
      .filter(s => (s.drill || '').split(' · ')[0] === family)
      .slice(-11, -1)  // exclude the one we just recorded, show prior 10
      .reverse();
    if (sessions.length) {
      const totalCorrect = sessions.reduce((a, s) => a + s.score, 0);
      const totalQs = sessions.reduce((a, s) => a + s.total, 0);
      const avgPct = totalQs > 0 ? Math.round(totalCorrect / totalQs * 100) : 0;
      const rows = sessions.map(s => {
        const sPct = s.total > 0 ? Math.round(s.score / s.total * 100) : 0;
        const sGrade = sPct >= 80 ? 'good' : sPct >= 50 ? 'mid' : 'low';
        return `<li>
          <span class="summary-recent-when">${formatWhen(s.at)}</span>
          <span class="summary-recent-score">${s.score}/${s.total}</span>
          <span class="summary-recent-pct ${sGrade}">${sPct}%</span>
        </li>`;
      }).join('');
      recentHtml = `
        <div class="summary-recent">
          <div class="summary-recent-title">Recent runs · avg ${avgPct}% over ${sessions.length}</div>
          <ul class="summary-recent-list">${rows}</ul>
        </div>`;
    }
  }

  app.innerHTML = `
    <div class="drill-container">
      <button class="drill-back">← Tools</button>
      <h1 class="drill-title">Session complete</h1>
      <p class="drill-hint">${drillName}</p>
      <div class="drill-main" style="padding:40px 20px">
        <div class="summary-pct ${grade}">${pct}%</div>
        <div class="summary-count">${score} / ${total} correct</div>
        <div class="summary-msg">${msg}</div>
      </div>
      <div class="row" style="gap:8px;margin-top:12px;justify-content:center">
        <button class="choice-btn" id="summary-restart">Restart drill</button>
        <button class="choice-btn" id="summary-home">Home</button>
      </div>
      ${runHistoryHtml}
      ${recentHtml}
    </div>
    <style>
      .summary-pct { font-size: 72px; font-weight: 500; margin-bottom: 8px; }
      .summary-pct.good { color: #2E7D32; }
      .summary-pct.mid  { color: #E65100; }
      .summary-pct.low  { color: #C62828; }
      .summary-count { font-size: 15px; color: var(--text-muted); margin-bottom: 16px; }
      .summary-msg { font-size: 14px; color: var(--text); }
    </style>
  `;
  app.querySelector('.drill-back').addEventListener('click', backToTools);
  app.querySelector('#summary-home').addEventListener('click', backToTools);
  app.querySelector('#summary-restart').addEventListener('click', onRestart);
}

function formatWhen(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = d.toTimeString().slice(0, 5);
  if (sameDay) return `Today ${hhmm}`;
  if (isYesterday) return `Yesterday ${hhmm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hhmm}`;
}

// Don't-repeat queue — avoid same item back-to-back in any drill
const NoRepeat = {
  q: new Map(),  // drillName -> array of recent items

  pick(drillName, pool, keyFn, avoidLast = 5) {
    if (!this.q.has(drillName)) this.q.set(drillName, []);
    const recent = this.q.get(drillName);

    // Filter pool to exclude recently-seen
    let available = pool.filter(item => !recent.includes(keyFn(item)));
    // Fallback if we filtered everything
    if (available.length === 0) available = pool;

    const picked = available[Math.floor(Math.random() * available.length)];
    recent.push(keyFn(picked));
    if (recent.length > avoidLast) recent.shift();
    return picked;
  },
};

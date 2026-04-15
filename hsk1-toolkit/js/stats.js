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

// Shared end-of-drill summary UI
function renderDrillSummary({ drillName, score, total, onRestart }) {
  STATS.recordSession(drillName, score, total);
  const pct = total > 0 ? Math.round(score / total * 100) : 0;
  const grade = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  const msg = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Nice work!' : pct >= 50 ? 'Keep going' : 'Tricky — try again';

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

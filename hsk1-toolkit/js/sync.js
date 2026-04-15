// sync.js — PocketBase sync client + SRS engine
// PB_URL injected by entrypoint.sh (placeholder: __PB_URL__)

// ── SRS (SM-2 variant) ────────────────────────────────────────────────────────
const SRS = {
  INITIAL_EASE: 2.5,
  MIN_EASE: 1.3,

  // Returns {srs_due, srs_interval, srs_ease} to merge into word stats
  update(existing, correct) {
    const ease = existing.srs_ease || this.INITIAL_EASE;
    const interval = existing.srs_interval || 0;
    let newEase, newInterval;

    if (correct) {
      newEase = Math.min(3.0, ease + 0.05);
      if (interval === 0)    newInterval = 1;
      else if (interval < 4) newInterval = 4;
      else                   newInterval = Math.round(interval * ease);
    } else {
      newEase = Math.max(this.MIN_EASE, ease - 0.15);
      newInterval = 0;
    }

    const dueDelta = newInterval === 0
      ? 10 * 60 * 1000                       // wrong → review in 10 min
      : newInterval * 24 * 60 * 60 * 1000;   // correct → N days

    return {
      srs_due:      Date.now() + dueDelta,
      srs_interval: newInterval,
      srs_ease:     Math.round(newEase * 1000) / 1000,
    };
  },

  // Words whose review is due now
  dueWords() {
    const stats = STATS.load();
    const now = Date.now();
    return Object.entries(stats.words)
      .filter(([, s]) => s.seen > 0 && (!s.srs_due || now >= s.srs_due))
      .sort((a, b) => (a[1].srs_due || 0) - (b[1].srs_due || 0))
      .map(([word]) => word);
  },

  // Human-readable "due in X" label
  dueLabel(srs_due) {
    if (!srs_due) return 'now';
    const diff = srs_due - Date.now();
    if (diff <= 0) return 'now';
    if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)}h`;
    return `${Math.round(diff / 86400000)}d`;
  },
};

// ── Sync client ───────────────────────────────────────────────────────────────
const SYNC = {
  baseUrl: (typeof PB_URL !== 'undefined' && PB_URL !== '__PB_URL__') ? PB_URL : null,
  token:   null,
  userId:  null,
  lastSync: null,
  _pushTimer: null,

  get enabled() { return !!this.baseUrl; },

  // Call once after app loads + user is authenticated
  async init(password) {
    if (!this.enabled) return;
    try {
      // Try cached token
      const cachedToken = sessionStorage.getItem('pb_token');
      const cachedUid   = sessionStorage.getItem('pb_uid');
      if (cachedToken && cachedUid) {
        this.token  = cachedToken;
        this.userId = cachedUid;
        await this._pull();
        this.lastSync = Date.now();
        this._updateStatusUI();
        return;
      }

      if (!password) return;
      await this._auth(password);
    } catch (e) {
      console.warn('[SYNC] init failed:', e.message);
      this._updateStatusUI();
    }
  },

  async _auth(password) {
    const resp = await fetch(`${this.baseUrl}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'student@hsk1.app', password }),
    });
    if (!resp.ok) throw new Error(`Auth ${resp.status}`);
    const data = await resp.json();
    this.token  = data.token;
    this.userId = data.record.id;
    sessionStorage.setItem('pb_token', this.token);
    sessionStorage.setItem('pb_uid',   this.userId);
    await this._pull();
    this.lastSync = Date.now();
    this._updateStatusUI();
  },

  // Schedule a push 3s after the last record call (debounce)
  schedulePush() {
    if (!this.enabled || !this.token) return;
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._push(), 3000);
  },

  async _push() {
    if (!this.token) return;
    try {
      const stats = STATS.load();
      const uid   = this.userId;
      const reqs  = [];

      // Word progress
      for (const [word, s] of Object.entries(stats.words)) {
        const payload = {
          user_id: uid, word,
          seen: s.seen || 0, correct: s.correct || 0, wrong: s.wrong || 0,
          last_seen: s.lastSeen || 0,
          srs_due:      s.srs_due      || 0,
          srs_interval: s.srs_interval || 0,
          srs_ease:     s.srs_ease     || SRS.INITIAL_EASE,
        };
        if (s._rid) {
          reqs.push(this._patch('word_progress', s._rid, payload)
            .catch(() => {}));
        } else {
          reqs.push(this._post('word_progress', payload)
            .then(d => { if (d) s._rid = d.id; })
            .catch(() => {}));
        }
      }

      // Syllable progress
      for (const [key, s] of Object.entries(stats.syllables)) {
        const payload = {
          user_id: uid, key,
          seen: s.seen || 0, correct: s.correct || 0, wrong: s.wrong || 0,
        };
        if (s._rid) {
          reqs.push(this._patch('syllable_progress', s._rid, payload).catch(() => {}));
        } else {
          reqs.push(this._post('syllable_progress', payload)
            .then(d => { if (d) s._rid = d.id; })
            .catch(() => {}));
        }
      }

      // Drill sessions (unsyced ones only)
      for (const s of stats.sessions) {
        if (s._synced) continue;
        reqs.push(this._post('drill_sessions', {
          user_id: uid, drill: s.drill, score: s.score, total: s.total, at: s.at,
        }).then(() => { s._synced = true; }).catch(() => {}));
      }

      await Promise.all(reqs);
      STATS.save();
      this.lastSync = Date.now();
      this._updateStatusUI();
    } catch (e) {
      console.warn('[SYNC] push failed:', e.message);
    }
  },

  async _pull() {
    if (!this.token) return;
    const uid = this.userId;

    const [wordResp, sylResp] = await Promise.all([
      fetch(`${this.baseUrl}/api/collections/word_progress/records?filter=${encodeURIComponent(`user_id="${uid}"`)}&perPage=2000`, {
        headers: { 'Authorization': this.token },
      }).catch(() => null),
      fetch(`${this.baseUrl}/api/collections/syllable_progress/records?filter=${encodeURIComponent(`user_id="${uid}"`)}&perPage=2000`, {
        headers: { 'Authorization': this.token },
      }).catch(() => null),
    ]);

    const stats = STATS.load();

    if (wordResp && wordResp.ok) {
      const { items = [] } = await wordResp.json();
      for (const r of items) {
        const local = stats.words[r.word] || {};
        stats.words[r.word] = {
          seen:         Math.max(local.seen     || 0, r.seen     || 0),
          correct:      Math.max(local.correct  || 0, r.correct  || 0),
          wrong:        Math.max(local.wrong    || 0, r.wrong    || 0),
          lastSeen:     Math.max(local.lastSeen || 0, r.last_seen || 0),
          srs_due:      r.srs_due      || local.srs_due      || 0,
          srs_interval: r.srs_interval || local.srs_interval || 0,
          srs_ease:     r.srs_ease     || local.srs_ease     || SRS.INITIAL_EASE,
          _rid: r.id,
        };
      }
    }

    if (sylResp && sylResp.ok) {
      const { items = [] } = await sylResp.json();
      for (const r of items) {
        const local = stats.syllables[r.key] || {};
        stats.syllables[r.key] = {
          seen:    Math.max(local.seen    || 0, r.seen    || 0),
          correct: Math.max(local.correct || 0, r.correct || 0),
          wrong:   Math.max(local.wrong   || 0, r.wrong   || 0),
          _rid: r.id,
        };
      }
    }

    STATS.save();
  },

  // ── HTTP helpers ─────────────────────────────────────────────────────────────
  async _post(collection, body) {
    const r = await fetch(`${this.baseUrl}/api/collections/${collection}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.token },
      body: JSON.stringify(body),
    });
    return r.ok ? r.json() : null;
  },

  async _patch(collection, id, body) {
    const r = await fetch(`${this.baseUrl}/api/collections/${collection}/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': this.token },
      body: JSON.stringify(body),
    });
    return r.ok ? r.json() : null;
  },

  // ── Status UI helpers ─────────────────────────────────────────────────────────
  status() {
    if (!this.enabled)  return { ok: false, msg: 'Sync not configured' };
    if (!this.token)    return { ok: false, msg: 'Not connected' };
    const t = this.lastSync ? new Date(this.lastSync).toLocaleTimeString() : '—';
    return { ok: true, msg: `Synced at ${t}` };
  },

  _updateStatusUI() {
    const el = document.getElementById('sync-status');
    if (!el) return;
    const s = this.status();
    el.textContent = s.msg;
    el.className   = 'sync-status ' + (s.ok ? 'ok' : 'err');
  },
};

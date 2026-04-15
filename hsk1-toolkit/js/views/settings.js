// TAB 4: Settings — tone colors, audio speed, pinyin display, font size
function viewSettings() {
  app.innerHTML = `
    <h1 class="page-title">Settings</h1>

    <div class="setting-group">
      <div class="setting-label">Meaning language</div>
      <div class="setting-desc">How to show word meanings and sentence translations</div>
      <div class="setting-choices" data-setting="meaningLang">
        <button class="choice-btn ${SETTINGS.meaningLang === 'cz' ? 'active' : ''}" data-value="cz">Česky</button>
        <button class="choice-btn ${SETTINGS.meaningLang === 'en' ? 'active' : ''}" data-value="en">English</button>
        <button class="choice-btn ${SETTINGS.meaningLang === 'both' ? 'active' : ''}" data-value="both">Both</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Theme</div>
      <div class="setting-choices" data-setting="theme">
        <button class="choice-btn ${SETTINGS.theme === 'auto' ? 'active' : ''}" data-value="auto">Auto</button>
        <button class="choice-btn ${SETTINGS.theme === 'light' ? 'active' : ''}" data-value="light">Light</button>
        <button class="choice-btn ${SETTINGS.theme === 'dark' ? 'active' : ''}" data-value="dark">Dark</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Audio speed</div>
      <div class="setting-desc">Slow down for tone practice</div>
      <div class="setting-choices" data-setting="audioSpeed">
        <button class="choice-btn ${SETTINGS.audioSpeed === 0.75 ? 'active' : ''}" data-value="0.75">0.75×</button>
        <button class="choice-btn ${SETTINGS.audioSpeed === 1.0 ? 'active' : ''}" data-value="1">1×</button>
        <button class="choice-btn ${SETTINGS.audioSpeed === 1.25 ? 'active' : ''}" data-value="1.25">1.25×</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Font size</div>
      <div class="setting-choices" data-setting="fontSize">
        <button class="choice-btn ${SETTINGS.fontSize === 'small' ? 'active' : ''}" data-value="small">Small</button>
        <button class="choice-btn ${SETTINGS.fontSize === 'medium' ? 'active' : ''}" data-value="medium">Medium</button>
        <button class="choice-btn ${SETTINGS.fontSize === 'large' ? 'active' : ''}" data-value="large">Large</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Pinyin display</div>
      <div class="setting-desc">When to show pinyin marks in drills</div>
      <div class="setting-choices" data-setting="pinyinDisplay">
        <button class="choice-btn ${SETTINGS.pinyinDisplay === 'always' ? 'active' : ''}" data-value="always">Always</button>
        <button class="choice-btn ${SETTINGS.pinyinDisplay === 'hide' ? 'active' : ''}" data-value="hide">Hide until tap</button>
        <button class="choice-btn ${SETTINGS.pinyinDisplay === 'never' ? 'active' : ''}" data-value="never">Never</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Syllable style</div>
      <div class="setting-desc">How pinyin boxes are rendered</div>
      <div class="setting-choices" data-setting="syllableStyle">
        <button class="choice-btn ${SETTINGS.syllableStyle === 'whole' ? 'active' : ''}" data-value="whole">Whole syllable</button>
        <button class="choice-btn ${SETTINGS.syllableStyle === 'split' ? 'active' : ''}" data-value="split">Split init|final</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Word Spotter fonts</div>
      <div class="setting-desc">Which fonts can appear when cycling · levels: easy ⭢ expert</div>
      <div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <button class="choice-btn" data-fontpreset="all">All on</button>
        <button class="choice-btn" data-fontpreset="easy">Easy only</button>
        <button class="choice-btn" data-fontpreset="medium">Easy + medium</button>
        <button class="choice-btn" data-fontpreset="none">None</button>
      </div>
      <div class="font-toggles" id="font-toggles">
        ${(typeof SPOTTER_FONTS !== 'undefined' ? SPOTTER_FONTS : []).map(f => {
          const enabled = (SETTINGS.enabledFonts || {})[f.label] !== false;
          return `
            <label class="font-toggle ${enabled ? 'on' : 'off'}">
              <input type="checkbox" data-font="${escapeHtml(f.label)}" ${enabled ? 'checked' : ''} />
              <span class="ft-sample" style="font-family: ${f.css}">中国</span>
              <span class="ft-label">${escapeHtml(f.label)}</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Tone colors</div>
      <div class="setting-desc">Colors used for each tone</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <span class="syl-box tone-1">1st — coral</span>
        <span class="syl-box tone-2">2nd — amber</span>
        <span class="syl-box tone-3">3rd — green</span>
        <span class="syl-box tone-4">4th — blue</span>
        <span class="syl-box tone-5">neutral — gray</span>
      </div>
    </div>

    <div class="setting-group">
      <div class="setting-label">Sync & Progress</div>
      ${SYNC.enabled ? `
        <div class="setting-desc">Cross-device sync via PocketBase</div>
        <div id="sync-status" class="sync-status ${SYNC.token ? 'ok' : 'err'}">
          ${SYNC.status().msg}
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--text-muted)">
          ${(() => {
            const due = SRS.dueWords().length;
            const stats = STATS.load();
            const seen = Object.keys(stats.words).length;
            const mastered = Object.values(stats.words).filter(s => (s.srs_interval || 0) >= 7).length;
            const streak = (() => {
              const sessions = stats.sessions;
              if (!sessions.length) return 0;
              let s = 0, day = new Date(); day.setHours(0,0,0,0);
              const dayMs = 86400000;
              while (true) {
                const hasSession = sessions.some(sess => sess.at >= day.getTime() && sess.at < day.getTime() + dayMs);
                if (!hasSession) break;
                s++;
                day = new Date(day.getTime() - dayMs);
              }
              return s;
            })();
            return `
              <span style="margin-right:12px">🔥 ${streak}-day streak</span>
              <span style="margin-right:12px">📚 ${seen} words seen</span>
              <span style="margin-right:12px">✓ ${mastered} mastered (7+ day interval)</span>
              ${due > 0 ? `<span style="color:var(--accent)">⏰ ${due} due for review</span>` : '<span>All caught up!</span>'}
            `;
          })()}
        </div>
        <button class="choice-btn" id="sync-now" style="margin-top:8px">Sync now</button>
      ` : `
        <div class="setting-desc" style="color:var(--text-muted)">
          Set <code>PB_URL</code> env var on the Coolify deployment to enable cross-device sync.
        </div>
      `}
    </div>

    <div style="font-size:11px;color:var(--text-muted);margin-top:32px;text-align:center">
      HSK 1 Toolkit · ${DATA.words.length} words · ${hskChars().length} characters<br>
      Audio: MSU Tone Perfect · Vocabulary: drkameleon/complete-hsk-vocabulary
    </div>
  `;

  // Font presets
  const FONT_PRESETS = {
    all: () => Object.fromEntries(SPOTTER_FONTS.map(f => [f.label, true])),
    easy: () => Object.fromEntries(SPOTTER_FONTS.map(f => [f.label, ['Sans (print)','Serif (book)'].includes(f.label)])),
    medium: () => Object.fromEntries(SPOTTER_FONTS.map(f => [f.label, !['Zhi Mang Xing (grass)','Long Cang (flowing)','Liu Jian Mao Cao (wild)'].includes(f.label)])),
    none: () => Object.fromEntries(SPOTTER_FONTS.map(f => [f.label, false])),
  };
  app.querySelectorAll('[data-fontpreset]').forEach(btn => {
    btn.addEventListener('click', () => {
      SETTINGS.enabledFonts = FONT_PRESETS[btn.dataset.fontpreset]();
      saveSettings(SETTINGS);
      viewSettings();
    });
  });

  // Font toggles
  app.querySelectorAll('#font-toggles input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (!SETTINGS.enabledFonts) SETTINGS.enabledFonts = {};
      SETTINGS.enabledFonts[cb.dataset.font] = cb.checked;
      saveSettings(SETTINGS);
      // Toggle visual state without full re-render
      cb.closest('.font-toggle').classList.toggle('on', cb.checked);
      cb.closest('.font-toggle').classList.toggle('off', !cb.checked);
    });
  });

  const syncNowBtn = app.querySelector('#sync-now');
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', async () => {
      syncNowBtn.disabled = true;
      syncNowBtn.textContent = 'Syncing…';
      await SYNC._push();
      syncNowBtn.textContent = 'Done';
      setTimeout(() => { syncNowBtn.disabled = false; syncNowBtn.textContent = 'Sync now'; }, 1500);
    });
  }

  app.querySelectorAll('.setting-choices').forEach(group => {
    const key = group.dataset.setting;
    group.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        let val = btn.dataset.value;
        if (key === 'audioSpeed') val = parseFloat(val);
        SETTINGS[key] = val;
        saveSettings(SETTINGS);
        viewSettings();
      });
    });
  });
}

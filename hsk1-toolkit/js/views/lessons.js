// TAB 3: Lessons — tutor lesson progression hub + topic word packs

// Topic packs — curated by semantic category using HSK 1 vocab
const WORD_PACKS = [
  { id: 'pronouns',   name: 'Pronouns',         icon: '👤', chars: ['我','你','他','她','我们','你们','他们','她们','您','这','那'] },
  { id: 'numbers',    name: 'Numbers 1-10',     icon: '🔢', chars: ['一','二','三','四','五','六','七','八','九','十','零','百'] },
  { id: 'family',     name: 'Family',           icon: '👪', chars: ['爸爸','妈妈','哥哥','姐姐','弟弟','妹妹','儿子','女儿','爷爷','奶奶','家','家人'] },
  { id: 'greetings',  name: 'Greetings · Basics', icon: '👋', chars: ['你好','谢谢','对不起','没关系','再见','请','请问','不客气','好','行'] },
  { id: 'verbs_core', name: 'Core Verbs',       icon: '⚡', chars: ['是','有','在','去','来','做','吃','喝','看','听','说','要','会','能','想'] },
  { id: 'time',       name: 'Time · When',      icon: '⏰', chars: ['今天','明天','昨天','现在','早上','晚上','上午','下午','中午','年','月','日','星期','小时','分','点','半','时间','时候'] },
  { id: 'food',       name: 'Food · Drink',     icon: '🍚', chars: ['吃','喝','饭','米饭','菜','水','茶','水果','鸡蛋','肉','面包','牛奶','早饭','午饭','晚饭','吃饭'] },
  { id: 'places',     name: 'Places',           icon: '📍', chars: ['家','学校','医院','商店','饭店','机场','车站','北京','中国','公司','这里','那里','哪里','路上','门口','房间','房子'] },
  { id: 'question',   name: 'Question Words',   icon: '❓', chars: ['什么','谁','哪','哪里','哪儿','多少','几','怎么','吗','呢','是不是'] },
  { id: 'people',     name: 'People · Roles',   icon: '🧑', chars: ['人','老师','学生','朋友','男人','女人','小姐','先生','孩子','小朋友','医生','工人'] },
  { id: 'school',     name: 'School · Study',   icon: '📚', chars: ['学校','学生','老师','书','书店','读书','学习','写','听','说','认识','考试','课','上课','下课','字','汉字'] },
  { id: 'adjectives', name: 'Adjectives',       icon: '✨', chars: ['好','大','小','多','少','长','高','新','旧','忙','累','冷','热','对','贵','远','快','慢'] },
  { id: 'directions', name: 'Directions',       icon: '🧭', chars: ['上','下','左','右','前','后','里','外','东','南','西','北','中间','旁边','上边','下边'] },
  { id: 'body',       name: 'Body · Health',    icon: '💪', chars: ['身体','手','口','眼睛','头','身上','病','病人','医生','医院','累','生病','看病'] },
  { id: 'tech',       name: 'Modern · Tech',    icon: '📱', chars: ['电话','手机','电脑','电视','电视机','上网','网友','电影','电影院','汽车','飞机','火车'] },
];

function viewLessons() {
  const tutorLessons = (DATA.tutorLessons || []).filter(l => l.chars_hsk && l.chars_hsk.length > 0);

  app.innerHTML = `
    <h1 class="page-title">Lessons</h1>
    <p class="page-subtitle">Activate lessons to scope your drills</p>

    ${tutorLessons.length > 0 ? `
      <div class="tool-group-label">
        <span class="tgl-name">Tutor Lessons</span>
        <span class="tgl-desc">Activate to include in drills</span>
      </div>
      <div id="lesson-cards" style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${tutorLessons.map(l => renderLessonCard(l)).join('')}
      </div>
    ` : ''}

    <div class="tool-group-label">
      <span class="tgl-name">By Topic</span>
      <span class="tgl-desc">HSK 1 semantic groups</span>
    </div>
    <div class="pack-grid" id="pack-grid">
      ${WORD_PACKS.map(pack => {
        const existing = pack.chars.filter(c => DATA.words.find(w => w.simplified === c));
        return `
          <div class="pack-card" data-pack="${pack.id}">
            <div class="pack-icon">${pack.icon}</div>
            <div class="pack-info">
              <div class="pack-name">${escapeHtml(pack.name)}</div>
              <div class="pack-count">${existing.length} words</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  app.querySelectorAll('.lesson-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLesson(parseInt(btn.dataset.lesson));
    });
  });
  app.querySelectorAll('.lesson-drill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveTab('tools');
    });
  });
  app.querySelectorAll('.lesson-card[data-tutor]').forEach(card => {
    card.addEventListener('click', () => openTutorLesson(parseInt(card.dataset.tutor)));
  });
  app.querySelectorAll('.pack-card[data-pack]').forEach(row => {
    row.addEventListener('click', () => openPack(row.dataset.pack));
  });
}

function renderLessonCard(l) {
  const p = lessonProgress(l.num);
  const isActive = SCOPE.activeLessons.includes(l.num);
  const pct = p.total > 0 ? Math.round(p.mastered / p.total * 100) : 0;
  const barFill = p.total > 0 ? Math.round(p.seen / p.total * 100) : 0;
  const mastFill = pct;

  return `
    <div class="lesson-card" data-tutor="${l.num}" style="
      background: var(--card-bg, #fff);
      border: 1.5px solid ${isActive ? 'var(--accent, #D85A30)' : 'var(--border, #e5e2dc)'};
      border-radius: 12px;
      padding: 14px 16px;
      cursor: pointer;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:15px;margin-bottom:2px">
            ${escapeHtml(l.title || 'Lesson ' + l.num)}
            ${isActive ? '<span style="color:var(--accent,#D85A30);font-size:12px;font-weight:500;margin-left:6px">Active</span>' : ''}
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
            ${p.seen} / ${p.total} seen · ${p.mastered} mastered
            ${p.due > 0 ? ` · <span style="color:#D85A30;font-weight:500">${p.due} due</span>` : ''}
          </div>
          <div style="height:6px;border-radius:3px;background:var(--border,#e5e2dc);overflow:hidden;margin-bottom:2px">
            <div style="height:100%;border-radius:3px;background:var(--accent,#D85A30);opacity:0.35;width:${barFill}%;transition:width .3s"></div>
          </div>
          <div style="height:6px;border-radius:3px;background:transparent;overflow:hidden;margin-top:-6px">
            <div style="height:100%;border-radius:3px;background:var(--accent,#D85A30);width:${mastFill}%;transition:width .3s"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${mastFill}% mastered</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="lesson-toggle" data-lesson="${l.num}" style="
            padding:6px 14px;
            border-radius:8px;
            border:1.5px solid ${isActive ? 'var(--accent,#D85A30)' : 'var(--border,#ccc)'};
            background:${isActive ? 'var(--accent,#D85A30)' : 'transparent'};
            color:${isActive ? '#fff' : 'var(--text)'};
            font-size:13px;
            font-weight:500;
            cursor:pointer;
            white-space:nowrap;
          ">${isActive ? 'Deactivate' : 'Activate'}</button>
          ${isActive ? `
            <button class="lesson-drill" data-lesson="${l.num}" style="
              padding:6px 14px;
              border-radius:8px;
              border:1.5px solid var(--accent,#D85A30);
              background:transparent;
              color:var(--accent,#D85A30);
              font-size:13px;
              font-weight:500;
              cursor:pointer;
              white-space:nowrap;
            ">Drill →</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function toggleLesson(num) {
  const idx = SCOPE.activeLessons.indexOf(num);
  if (idx === -1) SCOPE.activeLessons.push(num);
  else SCOPE.activeLessons.splice(idx, 1);
  saveScope();
  viewLessons();
}

function openTutorLesson(num) {
  const lesson = (DATA.tutorLessons || []).find(l => l.num === num);
  if (!lesson) return;
  const words = lesson.chars_hsk
    .map(c => DATA.words.find(w => w.simplified === c))
    .filter(Boolean);
  const extra = lesson.chars_extra || [];

  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet" onclick="event.stopPropagation()">
      <button class="sheet-close" aria-label="Close">×</button>
      <h2 style="font-size:20px;font-weight:500;margin-bottom:4px">📖 ${escapeHtml(lesson.title || 'Lesson ' + lesson.num)}</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">${words.length} HSK 1 words${extra.length ? ` · ${extra.length} extra chars` : ''}</p>

      <div class="sheet-label">HSK 1 vocabulary</div>
      ${words.map(w => `
        <div class="word-row" data-char="${escapeHtml(w.simplified)}">
          <div class="word-char">${escapeHtml(w.simplified)}</div>
          <div class="word-info">
            <div class="word-pinyin-row">${renderWordBoxes(w, { clickable: false })}</div>
            <div class="word-meaning">${escapeHtml(formatMeaning(w))}</div>
          </div>
          <button class="word-play" data-play="${escapeHtml(w.simplified)}" title="Play">▶</button>
        </div>
      `).join('')}

      ${extra.length ? `
        <div class="sheet-label">Extra characters (not in HSK 1)</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${extra.map(c => `<span style="padding:6px 10px;background:var(--tone-5-bg);border-radius:6px;font-size:18px">${escapeHtml(c)}</span>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted)">These appeared in your lesson but aren't part of the HSK 1 word list.</div>
      ` : ''}
    </div>
  `;

  overlay.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.sheet-close').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('.word-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.word-play')) return;
      e.stopPropagation();
      overlay.remove();
      openWordSheet(row.dataset.char);
    });
  });
  overlay.querySelectorAll('.word-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const w = DATA.words.find(w => w.simplified === btn.dataset.play);
      if (w) AUDIO.playWord(w);
    });
  });

  document.body.appendChild(overlay);
}

function openPack(packId) {
  const pack = WORD_PACKS.find(p => p.id === packId);
  if (!pack) return;
  const words = pack.chars
    .map(c => DATA.words.find(w => w.simplified === c))
    .filter(Boolean);

  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet" onclick="event.stopPropagation()">
      <button class="sheet-close" aria-label="Close">×</button>
      <h2 style="font-size:20px;font-weight:500;margin-bottom:4px">${pack.icon} ${escapeHtml(pack.name)}</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${words.length} words</p>
      <div class="pack-actions">
        <button class="btn-drill" data-action="dictation">🎧 Practice Dictation with this pack</button>
      </div>
      <div>
        ${words.map(w => `
          <div class="word-row" data-char="${escapeHtml(w.simplified)}">
            <div class="word-char">${escapeHtml(w.simplified)}</div>
            <div class="word-info">
              <div class="word-pinyin-row">${renderWordBoxes(w, { clickable: false })}</div>
              <div class="word-meaning">${escapeHtml(formatMeaning(w))}</div>
            </div>
            <button class="word-play" data-play="${escapeHtml(w.simplified)}" title="Play">▶</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  overlay.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.sheet-close').addEventListener('click', () => overlay.remove());
  overlay.querySelectorAll('.word-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.word-play')) return;
      e.stopPropagation();
      overlay.remove();
      openWordSheet(row.dataset.char);
    });
  });
  overlay.querySelectorAll('.word-play').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const w = DATA.words.find(w => w.simplified === btn.dataset.play);
      if (w) AUDIO.playWord(w);
    });
  });
  overlay.querySelector('[data-action="dictation"]').addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
    drillDictation(words, pack.name);
  });

  document.body.appendChild(overlay);
}

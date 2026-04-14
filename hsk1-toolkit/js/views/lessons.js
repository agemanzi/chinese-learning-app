// TAB 3: Word Packs — HSK 1 vocabulary grouped by topic

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
  const tutorLessonsWithVocab = (DATA.tutorLessons || []).filter(l => l.chars_hsk && l.chars_hsk.length > 0);

  app.innerHTML = `
    <h1 class="page-title">Word Packs</h1>
    <p class="page-subtitle">HSK 1 vocabulary grouped by topic</p>

    ${tutorLessonsWithVocab.length > 0 ? `
      <div class="tool-group-label" style="margin-top:8px">
        <span class="tgl-name">Tutor Lessons</span>
        <span class="tgl-desc">From your in-person classes</span>
      </div>
      <div class="pack-grid" style="margin-bottom:24px">
        ${tutorLessonsWithVocab.map(l => `
          <div class="pack-card" data-tutor="${l.num}">
            <div class="pack-icon">📖</div>
            <div class="pack-info">
              <div class="pack-name">Lesson ${l.num}</div>
              <div class="pack-count">${l.chars_hsk.length} words${l.chars_extra.length ? ` · +${l.chars_extra.length} extra` : ''}</div>
            </div>
          </div>
        `).join('')}
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

  app.querySelectorAll('.pack-card[data-pack]').forEach(row => {
    row.addEventListener('click', () => openPack(row.dataset.pack));
  });
  app.querySelectorAll('.pack-card[data-tutor]').forEach(row => {
    row.addEventListener('click', () => openTutorLesson(parseInt(row.dataset.tutor)));
  });
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
      <h2 style="font-size:20px;font-weight:500;margin-bottom:4px">📖 ${escapeHtml(lesson.title)}</h2>
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
        <div style="font-size:11px;color:var(--text-muted)">These appeared in your lesson but aren't part of the HSK 1 word list. Look them up in your tutor's materials.</div>
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

// Drill 2: Minimal Pairs — hear two syllables back-to-back, identify the difference
function drillMinimalPairs() {
  // Build pairs that differ on key confusable dimensions
  const pairs = buildMinimalPairs();
  const state = {
    current: null,
    answered: false,
    count: 0,
    score: 0,
  };

  function next() {
    state.current = pairs[Math.floor(Math.random() * pairs.length)];
    state.answered = false;
    state.count++;
    render();
  }

  async function playBoth() {
    const p = state.current;
    const tag = AUDIO.nextSpeaker();
    await AUDIO.play(p.a, p.tone, tag);
    await new Promise(r => setTimeout(r, 400));
    await AUDIO.play(p.b, p.tone, tag);
  }

  function render() {
    const options = [
      { id: 'n-ng',   label: 'n vs. ng',  desc: 'final -n / -ng' },
      { id: 'z-zh',   label: 'z vs. zh',  desc: 'flat vs. curled' },
      { id: 'x-sh',   label: 'x vs. sh',  desc: 'soft vs. hard' },
      { id: 'q-ch',   label: 'q vs. ch',  desc: 'soft vs. hard' },
      { id: 'an-ang', label: 'an vs. ang', desc: 'final -an / -ang' },
      { id: 'in-ing', label: 'in vs. ing', desc: 'final -in / -ing' },
    ];

    app.innerHTML = `
      <div class="drill-container">
        <button class="drill-back">← Tools</button>
        <h1 class="drill-title">Minimal Pairs</h1>
        <p class="drill-hint">Two sounds back-to-back · which pair type?</p>

        <div class="drill-counter">Question ${state.count} · Score ${state.score}/${Math.max(0, state.count - 1)}</div>

        <div class="drill-main">
          <button class="play-btn" id="mp-play">▶</button>
          <div class="tip" style="margin-top:14px;font-size:13px;color:var(--text-muted)">Tap to replay</div>
          <div id="mp-reveal" style="margin-top:20px"></div>
        </div>

        <div class="drill-options" style="grid-template-columns:1fr 1fr">
          ${options.map(o => `
            <button class="drill-option" data-id="${o.id}">
              <span class="opt-label">${o.label}</span>
              <span class="opt-desc">${o.desc}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    app.querySelector('.drill-back').addEventListener('click', backToTools);
    app.querySelector('#mp-play').addEventListener('click', playBoth);
    app.querySelectorAll('.drill-option').forEach(btn => {
      btn.addEventListener('click', () => answer(btn.dataset.id, btn));
    });
  }

  function answer(id, btn) {
    if (state.answered) return;
    state.answered = true;
    const correct = id === state.current.type;
    if (correct) state.score++;

    app.querySelectorAll('.drill-option').forEach(b => {
      if (b.dataset.id === state.current.type) b.classList.add('correct');
      else if (b === btn) b.classList.add('incorrect');
    });

    const p = state.current;
    document.getElementById('mp-reveal').innerHTML = `
      <div class="reveal">
        ${renderSylBox(p.a, p.tone)}
        <span style="margin:0 8px;color:var(--text-muted)">vs</span>
        ${renderSylBox(p.b, p.tone)}
      </div>
    `;

    setTimeout(next, 2200);
  }

  next();
}

function buildMinimalPairs() {
  // Construct pairs across known-confusable dimensions
  const allCombos = [...hskSyllables().keys()].filter(k => !k.endsWith('_5'));
  const byBase = {};
  for (const k of allCombos) {
    const [syl, tone] = k.split('_');
    (byBase[tone] = byBase[tone] || []).push(syl);
  }

  const pairs = [];
  // n/ng pairs: pan/pang, ban/bang, etc.
  const patterns = [
    { type: 'n-ng',   test: s => s.endsWith('ang') || s.endsWith('eng') || s.endsWith('ing'),
                       other: s => s.replace(/ng$/, 'n') },
    { type: 'an-ang', test: s => s.endsWith('ang') && !s.endsWith('iang') && !s.endsWith('uang'),
                       other: s => s.replace(/ang$/, 'an') },
    { type: 'in-ing', test: s => s.endsWith('ing'),
                       other: s => s.replace(/ing$/, 'in') },
    { type: 'z-zh',   test: s => s.startsWith('zh') && !s.startsWith('zhi'),
                       other: s => 'z' + s.slice(2) },
    { type: 'x-sh',   test: s => s.startsWith('sh'),
                       other: s => 'x' + s.slice(2) },
    { type: 'q-ch',   test: s => s.startsWith('ch'),
                       other: s => 'q' + s.slice(2) },
  ];

  for (const tone of ['1', '2', '3', '4']) {
    const sylSet = new Set(byBase[tone] || []);
    for (const syl of sylSet) {
      for (const pat of patterns) {
        if (pat.test(syl)) {
          const otherSyl = pat.other(syl);
          if (sylSet.has(otherSyl) && otherSyl !== syl) {
            pairs.push({ a: syl, b: otherSyl, tone: parseInt(tone), type: pat.type });
          }
        }
      }
    }
  }

  return pairs;
}

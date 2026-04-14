// TAB 1: Tools — drills grouped by category
function viewTools() {
  const groups = [
    {
      label: 'Sound · Tones',
      desc: 'Listen, identify, compare',
      tools: [
        { id: 'tone-ear',       name: 'Tone Ear',       desc: 'Pick the tone you hear (HSK 1)' },
        { id: 'pinyin-drill',   name: 'Tone Drill',     desc: 'All 410 syllables · random voice' },
        { id: 'minimal-pairs',  name: 'Minimal Pairs',  desc: 'n/ng, z/zh, x/sh, q/ch' },
        { id: 'syllable-build', name: 'Syllable Build', desc: 'Initial + Final + Tone' },
        { id: 'initial-final',  name: 'Initial / Final', desc: 'Split any syllable' },
      ],
    },
    {
      label: 'Words',
      desc: 'Read, decode, recall',
      tools: [
        { id: 'word-spotter', name: 'Word Spotter', desc: 'Random font · pick meaning' },
        { id: 'type-it',      name: 'Type It',      desc: 'Type pinyin, pick character' },
        { id: 'word-decoder', name: 'Word Decoder', desc: 'Words split into syllable boxes' },
        { id: 'dictation',    name: 'Dictation',    desc: 'Hear 5 words · type pinyin + tones' },
      ],
    },
    {
      label: 'Characters',
      desc: 'Strokes, radicals, writing',
      tools: [
        { id: 'stroke-order',    name: 'Stroke Order',    desc: 'Watch & trace' },
        { id: 'radical-spotter', name: 'Radical Spotter', desc: 'Find components' },
      ],
    },
  ];

  app.innerHTML = `
    <div class="tools-header">
      <div>
        <h1 class="page-title" style="margin-bottom:2px">HSK 1 Toolkit</h1>
        <p class="page-subtitle" style="margin-bottom:0">${DATA.words.length} words · ${hskChars().length} characters</p>
      </div>
      <button class="guide-btn" id="open-guide" title="How to study">📖 Guide</button>
    </div>
    ${groups.map(g => `
      <div class="tool-group">
        <div class="tool-group-label">
          <span class="tgl-name">${g.label}</span>
          <span class="tgl-desc">${g.desc}</span>
        </div>
        <div class="tools-grid">
          ${g.tools.map(t => `
            <div class="tool-card" data-tool="${t.id}">
              <div class="tool-name">${t.name}</div>
              <div class="tool-desc">${t.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;

  app.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => openDrill(card.dataset.tool));
  });
  app.querySelector('#open-guide').addEventListener('click', openGuide);
}

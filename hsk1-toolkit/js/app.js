// HSK 1 Toolkit — main router
const app = document.getElementById('app');

const VIEWS = {
  tools: viewTools,
  words: viewWords,
  lessons: viewLessons,
  settings: viewSettings,
};

function openGuide() { setDrillKeyHandler(null); viewGuide(); window.scrollTo(0, 0); }

const DRILLS = {
  'tone-ear': drillToneEar,
  'minimal-pairs': drillMinimalPairs,
  'word-decoder': drillWordDecoder,
  'initial-final': drillInitialFinal,
  'stroke-order': drillStrokeOrder,
  'radical-spotter': drillRadicalSpotter,
  'pinyin-drill': drillPinyinDrill,
  'syllable-build': drillSyllableBuild,
  'word-spotter': drillWordSpotter,
  'type-it': drillTypeIt,
  'dictation': drillDictation,
};

let currentTab = 'tools';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Global drill keyboard handler registry — remove on navigation
let _drillKeyHandler = null;
function setDrillKeyHandler(handler) {
  if (_drillKeyHandler) document.removeEventListener('keydown', _drillKeyHandler);
  _drillKeyHandler = handler;
  if (handler) document.addEventListener('keydown', handler);
}

function setActiveTab(name) {
  setDrillKeyHandler(null);
  currentTab = name;
  document.querySelectorAll('#tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  (VIEWS[name] || viewTools)();
  window.scrollTo(0, 0);
}

function openDrill(name) {
  setDrillKeyHandler(null);
  const fn = DRILLS[name];
  if (fn) fn();
  window.scrollTo(0, 0);
}

function backToTools() { setActiveTab('tools'); }

// Load settings from localStorage
function loadSettings() {
  const raw = localStorage.getItem('hsk1_settings');
  const defaults = {
    audioSpeed: 1.0,
    pinyinDisplay: 'always',  // always | hide | never
    syllableStyle: 'whole',   // whole | split
    fontSize: 'medium',
    theme: 'auto',  // auto | light | dark
    meaningLang: 'both',  // en | cz | both
    // Word Spotter font choices (by label). Default: easy + medium only.
    enabledFonts: {
      'Sans (print)': true,
      'Serif (book)': true,
      'Ma Shan Zheng (bold brush)': true,
      'Zhi Mang Xing (grass)': false,
      'Long Cang (flowing)': false,
      'Liu Jian Mao Cao (wild)': false,
      'KuaiLe (playful)': true,
      'HuangYou (chunky)': true,
      'XiaoWei (elegant)': true,
    },
  };
  try {
    return { ...defaults, ...JSON.parse(raw || '{}') };
  } catch {
    return defaults;
  }
}

function saveSettings(s) {
  localStorage.setItem('hsk1_settings', JSON.stringify(s));
  applySettings(s);
}

function applySettings(s) {
  AUDIO.setSpeed(s.audioSpeed);
  document.body.dataset.fontSize = s.fontSize;
  document.documentElement.dataset.theme = s.theme || 'auto';
}

let SETTINGS = loadSettings();

// Initialize app
async function init() {
  app.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading...</div>';
  try {
    await loadData();
    applySettings(SETTINGS);
    setActiveTab('tools');
    document.querySelectorAll('#tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
    });
    // Preload Chinese web fonts in the background so they're ready when Word Spotter opens
    preloadChineseFonts();
  } catch (e) {
    app.innerHTML = `<div style="padding:40px;color:#c62828">Failed to load data: ${e.message}</div>`;
    console.error(e);
  }
}

// Force-load Chinese web fonts for the characters we'll display
async function preloadChineseFonts() {
  const fonts = ['Noto Sans SC','Noto Serif SC','Ma Shan Zheng','Zhi Mang Xing','Long Cang','Liu Jian Mao Cao','ZCOOL KuaiLe','ZCOOL QingKe HuangYou','ZCOOL XiaoWei'];
  const sample = hskChars().slice(0, 80).join('');
  await Promise.all(fonts.map(f =>
    document.fonts.load('80px "' + f + '"', sample).catch(() => {})
  ));
}

init();

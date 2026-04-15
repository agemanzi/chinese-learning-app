// Data loader — single source of truth for HSK 1 words & radicals
const DATA = {
  words: [],
  radicals: [],
  radicalByChar: {},
  sentences: [],
  tutorLessons: [],
};

async function loadData() {
  // Cache-bust data files so browsers pick up updates after deploys
  const v = typeof SW_VERSION !== 'undefined' ? SW_VERSION : Date.now();
  const [words, radicals, sentences, tutorLessons] = await Promise.all([
    fetch(`data/hsk1_simple.json?v=${v}`).then(r => r.json()),
    fetch(`data/radicals.json?v=${v}`).then(r => r.json()),
    fetch(`data/sentences.json?v=${v}`).then(r => r.json()).catch(() => []),
    fetch(`data/tutor_lessons.json?v=${v}`).then(r => r.json()).catch(() => []),
  ]);
  DATA.words = words;
  DATA.radicals = radicals;
  DATA.radicalByChar = Object.fromEntries(radicals.map(r => [r.radical, r]));
  DATA.sentences = sentences;
  DATA.tutorLessons = tutorLessons;
  return DATA;
}

// Find example sentences that contain this character
function sentencesFor(char) {
  return DATA.sentences.filter(s => s.zh.includes(char));
}

// Format a meaning string based on current language setting
function formatMeaning(word) {
  const lang = SETTINGS?.meaningLang || 'both';
  const en = word.meaning || '';
  const cz = word.meaning_cz || '';
  if (lang === 'en') return en;
  if (lang === 'cz') return cz || en;
  // 'both': show cz first if available, then en
  if (cz && en) return `${cz} · ${en}`;
  return cz || en;
}

// Format a sentence's translation based on current language setting
function formatSentenceMeaning(s) {
  const lang = SETTINGS?.meaningLang || 'both';
  const en = s.en || '';
  const cz = s.cz || '';
  if (lang === 'en') return en;
  if (lang === 'cz') return cz || en;
  if (cz && en) return `${cz} · ${en}`;
  return cz || en;
}

let _hskCharsCache = null;
let _hskSyllablesCache = null;
let _allSyllablesCache = null;

function hskChars() {
  if (_hskCharsCache) return _hskCharsCache;
  const seen = new Set();
  const chars = [];
  for (const w of DATA.words) {
    for (const ch of w.simplified) {
      if (/[\u4e00-\u9fff]/.test(ch) && !seen.has(ch)) {
        seen.add(ch);
        chars.push(ch);
      }
    }
  }
  return _hskCharsCache = chars;
}

function hskSyllables() {
  if (_hskSyllablesCache) return _hskSyllablesCache;
  const combos = new Map();
  for (const w of DATA.words) {
    for (let i = 0; i < w.syllables.length; i++) {
      const key = `${w.syllables[i]}_${w.tones[i]}`;
      combos.set(key, (combos.get(key) || 0) + 1);
    }
  }
  return _hskSyllablesCache = combos;
}

// Full 410-syllable pool (every syl+tone combo we have audio for)
async function loadAllSyllables() {
  if (_allSyllablesCache) return _allSyllablesCache;
  try {
    const map = await fetch('audio/syllables/tone_map.json').then(r => r.json());
    const combos = new Set();
    for (const key of Object.keys(map)) {
      const parts = key.split('_');
      if (parts.length >= 2) combos.add(`${parts[0]}_${parts[1]}`);
    }
    return _allSyllablesCache = [...combos];
  } catch {
    return _allSyllablesCache = [];
  }
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

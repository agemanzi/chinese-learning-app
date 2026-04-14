// Pinyin helpers — initial/final split, tone marks, syllable box rendering

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
                  'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

function splitInitialFinal(syllable) {
  const s = syllable.toLowerCase().replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ōóǒò]/g, 'o').replace(/[ūúǔù]/g, 'u');
  for (const init of INITIALS) {
    if (s.startsWith(init)) {
      return { initial: init, final: s.slice(init.length) };
    }
  }
  return { initial: '', final: s };
}

const TONE_MARKS = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

function applyToneMark(syllable, tone) {
  if (tone < 1 || tone > 4) return syllable;
  const idx = tone - 1;
  for (const v of ['a', 'e']) {
    if (syllable.includes(v)) return syllable.replace(v, TONE_MARKS[v][idx]);
  }
  if (syllable.includes('ou')) return syllable.replace('o', TONE_MARKS.o[idx]);
  for (let i = syllable.length - 1; i >= 0; i--) {
    const ch = syllable[i];
    if (TONE_MARKS[ch]) return syllable.slice(0, i) + TONE_MARKS[ch][idx] + syllable.slice(i + 1);
  }
  return syllable;
}

// Render a syllable as a tone-colored box
function renderSylBox(syllable, tone, options = {}) {
  const { split = false, hidden = false, clickable = true } = options;
  const marked = applyToneMark(syllable, tone);
  const toneClass = `tone-${tone}`;
  const hiddenClass = hidden ? ' hidden' : '';
  const splitClass = split ? ' split' : '';

  if (split && !hidden) {
    const { initial, final } = splitInitialFinal(syllable);
    const finalMarked = applyToneMark(final, tone);
    return `<span class="syl-box ${toneClass}${splitClass}" data-syl="${syllable}" data-tone="${tone}">
      <span class="syl-split-init">${initial}</span>
      <span class="syl-split-final">${finalMarked}</span>
    </span>`;
  }

  return `<span class="syl-box ${toneClass}${hiddenClass}" data-syl="${syllable}" data-tone="${tone}">${marked}</span>`;
}

// Render a word as a row of syllable boxes
function renderWordBoxes(word, options = {}) {
  return `<span class="syl-row">${word.syllables.map((s, i) =>
    renderSylBox(s, word.tones[i], options)
  ).join('')}</span>`;
}

// Wire up syllable box clicks to play audio
function wireSylClicks(container) {
  container.querySelectorAll('.syl-box[data-syl]').forEach(box => {
    box.addEventListener('click', () => {
      AUDIO.playRandom(box.dataset.syl, parseInt(box.dataset.tone));
    });
  });
}

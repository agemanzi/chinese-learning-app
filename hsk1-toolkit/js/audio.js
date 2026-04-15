// Audio player — plays syllable+tone MP3s from ../app/audio/
const AUDIO = {
  base: 'audio/syllables/',
  speakers: ['f1', 'f2', 'f3', 'm1', 'm2', 'm3'],
  currentSpeakerIdx: 0,
  playbackRate: 1.0,

  nextSpeaker() {
    this.currentSpeakerIdx = (this.currentSpeakerIdx + 1) % this.speakers.length;
    return this.speakers[this.currentSpeakerIdx];
  },

  getSpeaker() {
    return this.speakers[this.currentSpeakerIdx];
  },

  randomSpeaker() {
    return this.speakers[Math.floor(Math.random() * this.speakers.length)];
  },

  // Play a syllable+tone with a specific speaker (or current)
  play(syllable, tone, speakerTag) {
    // Normalize ü -> v for filenames
    const syl = syllable.replace(/ü/g, 'v');
    // Neutral tone (5) doesn't exist in Tone Perfect — use tone 1 as a soft fallback
    // but that changes meaning, so we just skip neutral tones silently
    if (tone === 5 || tone === 0) return Promise.resolve();

    const tag = speakerTag || this.getSpeaker();
    const filename = tag === 'f1'
      ? `${syl}_${tone}.mp3`
      : `${syl}_${tone}_${tag}.mp3`;

    return this._playFile(this.base + filename);
  },

  // Play a random speaker for this syllable
  playRandom(syllable, tone) {
    const tag = this.speakers[Math.floor(Math.random() * this.speakers.length)];
    return this.play(syllable, tone, tag);
  },

  // Play multiple syllables in sequence (for words)
  // speaker: fixed tag ('f1' etc), true = random per syllable, falsy = current speaker
  async playSequence(syllables, tones, gapMs = 150, speaker = null) {
    for (let i = 0; i < syllables.length; i++) {
      const tag = speaker === true ? this.randomSpeaker()
                : speaker        ? speaker
                :                  this.getSpeaker();
      await this.play(syllables[i], tones[i], tag);
      if (i < syllables.length - 1) {
        await new Promise(r => setTimeout(r, gapMs));
      }
    }
  },

  // Play a full word by its Chinese characters — uses audio-cmn recording if available,
  // falls back to chaining Tone Perfect syllables. Handles neutral tones naturally.
  async playWord(word) {
    const url = `audio/words/cmn-${encodeURIComponent(word.simplified)}.mp3`;
    // Try word-level audio first
    const ok = await this._tryPlayFile(url);
    if (!ok) {
      await this.playSequence(word.syllables, word.tones);
    }
  },

  // Returns true if the file played (or at least started), false if 404/error.
  _tryPlayFile(url) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.playbackRate = this.playbackRate;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
  },

  _playFile(url) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.playbackRate = this.playbackRate;
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(() => resolve());
    });
  },

  setSpeed(rate) {
    this.playbackRate = rate;
  },
};

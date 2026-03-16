// ============================================================
// Chinese Learning App - API Client
// All data comes from the Python backend via /api/*
// ============================================================

const API = {
  async getDB() {
    const res = await fetch('/api/db');
    return res.json();
  },

  async getVocabulary() {
    const res = await fetch('/api/vocabulary');
    return res.json();
  },

  async addVocabulary(entry) {
    const res = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return res.json();
  },

  async updateVocabulary(id, entry) {
    const res = await fetch(`/api/vocabulary/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return res.json();
  },

  async deleteVocabulary(id) {
    const res = await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getProgress() {
    const res = await fetch('/api/progress');
    return res.json();
  },

  async saveProgress(data) {
    const res = await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Worksheets
  async getWorksheets() {
    const res = await fetch('/api/worksheets');
    return res.json();
  },

  // Calendar
  async getCalendar(from, to) {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const res = await fetch('/api/calendar' + params);
    return res.json();
  },

  async getCalendarRaw() {
    const res = await fetch('/api/calendar/raw');
    return res.json();
  },

  async addCalendarEvent(event) {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return res.json();
  },

  async updateCalendarEvent(id, event) {
    const res = await fetch(`/api/calendar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return res.json();
  },

  async deleteCalendarEvent(id) {
    const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    return res.json();
  }
};

// These get populated on app init from the API
let TONES = [];
let INITIALS = [];
let PRONUNCIATION_PAIRS = [];

// Special syllables and finals notes (static reference, kept client-side)
const SPECIAL_SYLLABLES = [
  { pinyin: "zhi", slovak: "Džž",  note: "Samotná slabika, -i se nezní" },
  { pinyin: "chi", slovak: "Ččch", note: "Samotná slabika, -i se nezní" },
  { pinyin: "shi", slovak: "Šš",   note: "Samotná slabika, -i se nezní" },
  { pinyin: "ri",  slovak: "Ř",    note: "Samotná slabika, -i se nezní" },
  { pinyin: "zi",  slovak: "Dz",   note: "Samotná slabika, -i se nezní" },
  { pinyin: "ci",  slovak: "C",    note: "Samotná slabika, -i se nezní" },
  { pinyin: "si",  slovak: "S",    note: "Samotná slabika, -i se nezní" },
  { pinyin: "wu",  slovak: "U",    note: "w- se čte jako u" },
  { pinyin: "yi",  slovak: "I",    note: "y- se čte jako i" },
  { pinyin: "yu",  slovak: "Jü",   note: "ü zvuk" },
  { pinyin: "ye",  slovak: "Je",   note: "" },
  { pinyin: "yue", slovak: "Jüe",  note: "ü zvuk" },
  { pinyin: "yuan",slovak: "Jüen", note: "ü zvuk" },
  { pinyin: "yin", slovak: "Jin",  note: "" },
  { pinyin: "yun", slovak: "Jün",  note: "ü zvuk" },
  { pinyin: "ying",slovak: "Jing", note: "" }
];

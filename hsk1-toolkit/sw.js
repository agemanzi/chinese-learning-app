// HSK 1 Toolkit — Service Worker
// Caches app shell + data + fonts. Audio is cached on-demand (too big to pre-cache 9840 files).
const CACHE_VERSION = 'hsk1-v7';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

// Core app shell — cached on install
const SHELL_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/app.js',
  'js/data.js',
  'js/audio.js',
  'js/pinyin.js',
  'js/stats.js',
  'js/views/tools.js',
  'js/views/words.js',
  'js/views/lessons.js',
  'js/views/settings.js',
  'js/drills/tone-ear.js',
  'js/drills/minimal-pairs.js',
  'js/drills/word-decoder.js',
  'js/drills/initial-final.js',
  'js/drills/stroke-order.js',
  'js/drills/radical-spotter.js',
  'js/drills/pinyin-drill.js',
  'js/drills/syllable-build.js',
  'js/drills/word-spotter.js',
  'js/drills/type-it.js',
  'js/drills/dictation.js',
  'js/sync.js',
  'data/hsk1_simple.json',
  'data/radicals.json',
  'data/sentences.json',
  'data/tutor_lessons.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      // addAll is atomic — if any fails, all fail. Use individual adds to be resilient.
      Promise.all(SHELL_URLS.map(url =>
        cache.add(url).catch(err => console.warn('SW precache failed:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names
        .filter(n => !n.startsWith(CACHE_VERSION))
        .map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Audio files (.mp3): cache-first, stored in separate audio cache
// - Google Fonts: cache-first
// - Everything else: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Audio files — cache-first (stable, large) — JSON excluded
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache =>
        cache.match(event.request).then(cached =>
          cached || fetch(event.request).then(resp => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          }).catch(() => new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // Google Fonts — cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(cache =>
        cache.match(event.request).then(cached =>
          cached || fetch(event.request).then(resp => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          }).catch(() => cached || new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // Everything else — network first, fall back to cache
  event.respondWith(
    fetch(event.request).then(resp => {
      if (resp.ok && url.origin === location.origin) {
        const copy = resp.clone();
        caches.open(SHELL_CACHE).then(cache => cache.put(event.request, copy));
      }
      return resp;
    }).catch(() =>
      caches.match(event.request).then(cached =>
        cached || caches.match('index.html')
      )
    )
  );
});

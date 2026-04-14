"""
Download word-level audio for HSK 1 vocabulary from audio-cmn repo.
Each word (506 of them) becomes one MP3 named cmn-{hanzi}.mp3.

Resumable: skips files already downloaded.
Quality tier: 24k-abr (Variable BitRate, ~4KB/file, ~2MB total).

Usage:
    python download_word_audio.py
"""
import json
import os
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
HSK1_JSON = BASE / "data" / "hsk1_simple.json"
OUT_DIR = BASE / "audio" / "words"
BASE_URL = "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/24k-abr/hsk"

DELAY = 0.15  # between requests


def download(word):
    fname = f"cmn-{word}.mp3"
    filepath = OUT_DIR / fname
    if filepath.exists() and filepath.stat().st_size > 100:
        return 'skip'

    url = f"{BASE_URL}/{urllib.parse.quote(fname)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        if len(data) < 100:
            return 'empty'
        with open(filepath, 'wb') as f:
            f.write(data)
        return 'ok'
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return '404'
        return f'err-{e.code}'
    except Exception as e:
        return f'err-{e}'


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(HSK1_JSON, encoding='utf-8') as f:
        words = json.load(f)

    print(f"Target: {len(words)} HSK 1 words → {OUT_DIR}")

    counts = {'ok': 0, 'skip': 0, '404': 0, 'err': 0, 'empty': 0}
    missing = []
    for i, w in enumerate(words, 1):
        result = download(w['simplified'])
        if result in counts:
            counts[result] += 1
        elif result == '404':
            counts['404'] += 1
            missing.append(w['simplified'])
        else:
            counts['err'] += 1
            missing.append(w['simplified'])

        if i % 50 == 0 or i == len(words):
            print(f"[{i}/{len(words)}] ok={counts['ok']} skip={counts['skip']} 404={counts['404']} err={counts['err']}")

        if result == 'ok':
            time.sleep(DELAY)

    print(f"\nDone. Downloaded: {counts['ok']}, already had: {counts['skip']}")
    print(f"Not found (404): {counts['404']}, errors: {counts['err']}")
    if missing:
        print(f"\nMissing words ({len(missing)}): {', '.join(missing[:20])}{'...' if len(missing) > 20 else ''}")


if __name__ == '__main__':
    main()

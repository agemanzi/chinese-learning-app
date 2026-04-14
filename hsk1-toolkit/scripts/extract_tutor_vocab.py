"""
Extract Chinese vocabulary from tutor lesson MDs into tutor_lessons.json.
Maps each lesson's words to their HSK 1 entries where possible.
"""
import json
import os
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
LESSONS_MD = BASE.parent / "lessons_md"
HSK1_JSON = BASE / "data" / "hsk1_simple.json"
OUTPUT = BASE / "data" / "tutor_lessons.json"

# Regex for Chinese characters
CJK_RE = re.compile(r'[\u4e00-\u9fff]+')
# Pinyin pattern (with tone marks or numbers)
PINYIN_RE = re.compile(r'\b[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜÀ-ÿ]+\s*\d?\b')


def extract_words_from_md(md_path):
    """Pull all Chinese words from a lesson MD (preserving multi-char words)."""
    with open(md_path, encoding='utf-8') as f:
        text = f.read()
    # Find all Chinese character sequences
    words = []
    seen = set()
    for m in CJK_RE.finditer(text):
        w = m.group(0)
        # Strip punctuation and split on obvious boundaries
        for part in re.split(r'[，。？！；：、\s]', w):
            if part and part not in seen:
                seen.add(part)
                words.append(part)
    return words


def split_into_known_words(chinese_run, hsk_words):
    """Given 'A 的B' run, split into matched HSK words + single chars."""
    # Maximum match: try longest substrings first
    result = []
    i = 0
    while i < len(chinese_run):
        # Try longest HSK 1 word starting at i
        matched = None
        for j in range(min(len(chinese_run), i + 4), i, -1):
            candidate = chinese_run[i:j]
            if candidate in hsk_words:
                matched = candidate
                break
        if matched:
            result.append(matched)
            i += len(matched)
        else:
            result.append(chinese_run[i])
            i += 1
    return result


def main():
    if not LESSONS_MD.exists():
        print(f"Not found: {LESSONS_MD}")
        return

    # Load HSK 1 words for cross-referencing
    with open(HSK1_JSON, encoding='utf-8') as f:
        hsk_data = json.load(f)
    hsk_words_set = {w['simplified'] for w in hsk_data}
    hsk_by_char = {w['simplified']: w for w in hsk_data}

    lessons = []
    for md_file in sorted(LESSONS_MD.glob('lesson_*.md')):
        lesson_num = int(md_file.stem.split('_')[1])
        print(f"Lesson {lesson_num}: {md_file.name}")

        # Get raw Chinese runs
        raw_words = extract_words_from_md(md_file)

        # Segment each run into HSK words + standalone chars
        lesson_words = []
        seen = set()
        for run in raw_words:
            segments = split_into_known_words(run, hsk_words_set)
            for seg in segments:
                if seg not in seen and seg.strip():
                    seen.add(seg)
                    lesson_words.append(seg)

        # Only keep entries where we have HSK data (for drilling)
        in_hsk = [w for w in lesson_words if w in hsk_by_char]
        not_in_hsk = [w for w in lesson_words if w not in hsk_by_char]

        lessons.append({
            'num': lesson_num,
            'title': f'Lesson {lesson_num}',
            'chars_hsk': in_hsk,
            'chars_extra': not_in_hsk,  # tutor-specific, not in HSK 1
            'total_chars': len(lesson_words),
        })
        print(f"  {len(in_hsk)} HSK 1 · {len(not_in_hsk)} extra")

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(lessons, f, ensure_ascii=False, indent=1)
    print(f"\nSaved to {OUTPUT}")


if __name__ == '__main__':
    main()

"""
Batch-translate HSK 1 word meanings to Czech via Claude API.
Reads data/hsk1_simple.json, writes data/hsk1_simple.json with added 'meaning_cz' field.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python translate_meanings.py
"""
import json
import os
import sys
import time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Install: pip install anthropic")
    sys.exit(1)

BASE = Path(__file__).resolve().parent.parent
INPUT = BASE / "data" / "hsk1_simple.json"
OUTPUT = BASE / "data" / "hsk1_simple.json"  # same file, adds meaning_cz

BATCH_SIZE = 30  # words per API call

PROMPT = """Translate these Chinese-word English meanings to Czech. Keep translations concise (1-3 words per meaning where possible). Return ONLY a JSON array of Czech translations in the SAME ORDER as input, no other text.

Input format (JSON array): [{"zh": "我", "en": "I; me; my"}, ...]
Output format (JSON array of strings): ["já; mě; můj", ...]

Preserve multiple meanings with semicolons. Use natural Czech. For grammatical particles, use Czech grammar terminology (částice).

Input:
"""


def translate_batch(client, batch):
    """Translate a batch of words, return list of Czech strings."""
    prompt = PROMPT + json.dumps(batch, ensure_ascii=False, indent=1)
    msg = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    with open(INPUT, encoding="utf-8") as f:
        words = json.load(f)

    # Skip words that already have a Czech meaning
    to_translate = [(i, w) for i, w in enumerate(words) if not w.get("meaning_cz")]
    print(f"Total words: {len(words)} · To translate: {len(to_translate)}")

    if not to_translate:
        print("All words already have Czech meanings. Done.")
        return

    total_batches = (len(to_translate) + BATCH_SIZE - 1) // BATCH_SIZE
    for b in range(total_batches):
        chunk = to_translate[b * BATCH_SIZE:(b + 1) * BATCH_SIZE]
        input_items = [{"zh": w["simplified"], "en": w["meaning"]} for _, w in chunk]

        print(f"[{b + 1}/{total_batches}] translating {len(chunk)} words...")
        try:
            cz_meanings = translate_batch(client, input_items)
        except Exception as e:
            print(f"  Error: {e} — retrying once")
            time.sleep(2)
            try:
                cz_meanings = translate_batch(client, input_items)
            except Exception as e2:
                print(f"  Failed twice, skipping batch: {e2}")
                continue

        if len(cz_meanings) != len(chunk):
            print(f"  Mismatch: got {len(cz_meanings)} expected {len(chunk)}, skipping batch")
            continue

        for (idx, _), cz in zip(chunk, cz_meanings):
            words[idx]["meaning_cz"] = cz

        # Save after each batch (resumable)
        with open(OUTPUT, "w", encoding="utf-8") as f:
            json.dump(words, f, ensure_ascii=False, indent=1)

        time.sleep(0.5)

    print(f"\nDone! Translations saved to {OUTPUT}")


if __name__ == "__main__":
    main()

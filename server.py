"""
Chinese Learning App - Python Backend
Run: python server.py
Open: http://localhost:5000
"""
import json
import os
import uuid
from datetime import date, datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session, redirect, url_for

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "db.json"
PROGRESS_PATH = DATA_DIR / "progress.json"
APP_DIR = BASE_DIR / "app"

app = Flask(__name__, static_folder=str(APP_DIR))
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

APP_PASSWORD = os.environ.get("APP_PASSWORD", "")


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if APP_PASSWORD and not session.get("auth"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "unauthorized"}), 401
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated


LOGIN_HTML = """<!doctype html>
<html><head><title>Login</title><style>
body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);display:flex;flex-direction:column;gap:1rem;min-width:260px}
h2{margin:0;font-size:1.2rem}
input{padding:.6rem;border:1px solid #ddd;border-radius:4px;font-size:1rem}
button{padding:.6rem;background:#c0392b;color:#fff;border:none;border-radius:4px;font-size:1rem;cursor:pointer}
.err{color:#c0392b;font-size:.9rem}
</style></head><body>
<form method="post">
  <h2>🀄 Chinese App</h2>
  {error}
  <input type="password" name="password" placeholder="Password" autofocus>
  <button type="submit">Enter</button>
</form></body></html>"""


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("password") == APP_PASSWORD:
            session["auth"] = True
            return redirect("/")
        return LOGIN_HTML.format(error='<p class="err">Wrong password</p>'), 401
    return LOGIN_HTML.format(error="")


# ---- DB helpers ----

def read_db():
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def write_db(data):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_progress():
    if not PROGRESS_PATH.exists():
        return default_progress()
    with open(PROGRESS_PATH, encoding="utf-8") as f:
        return json.load(f)


def write_progress(data):
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def default_progress():
    return {
        "vocabulary": {},
        "pinyin": {
            "initialsCorrect": 0, "initialsIncorrect": 0,
            "tonesCorrect": 0, "tonesIncorrect": 0,
            "weakInitials": [], "weakTones": []
        },
        "pairs": {},
        "sessions": [],
        "streakDays": 0,
        "lastStudyDate": None
    }


# ---- Static files ----

@app.route("/")
@login_required
def index():
    return send_from_directory(str(APP_DIR), "index.html")


@app.route("/<path:path>")
@login_required
def static_files(path):
    return send_from_directory(str(APP_DIR), path)


WORKSHEETS_DIR = BASE_DIR / "worksheets"


@app.route("/worksheets/<path:filename>")
@login_required
def serve_worksheet(filename):
    return send_from_directory(str(WORKSHEETS_DIR), filename)


@app.route("/api/worksheets")
@login_required
def list_worksheets():
    """List available worksheet PDFs with metadata."""
    if not WORKSHEETS_DIR.exists():
        return jsonify([])
    files = []
    for f in sorted(WORKSHEETS_DIR.iterdir()):
        if f.suffix.lower() == ".pdf":
            files.append({
                "filename": f.name,
                "url": f"/worksheets/{f.name}",
                "size_kb": round(f.stat().st_size / 1024),
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()[:10],
            })
    return jsonify(files)


# ---- API: Audio coverage stats ----

AUDIO_DIR = APP_DIR / "audio"


@app.route("/api/audio-stats")
@login_required
def audio_stats():
    """Live stats about downloaded tone audio files."""
    tone_map_path = AUDIO_DIR / "tone_map.json"
    if not tone_map_path.exists():
        return jsonify({"total_files": 0, "speakers": {}, "syllables": 0, "combos": 0, "disk_mb": 0})

    with open(tone_map_path, encoding="utf-8") as f:
        tm = json.load(f)

    # Count per speaker
    speakers = {}
    unique_combos = set()
    syllables = set()
    for key, val in tm.items():
        tag = val.get("tag", "f1")
        speakers[tag] = speakers.get(tag, 0) + 1
        base = key.rsplit("_", 1)[0] if len(key.split("_")) > 2 and key[-2] in "fm" else key
        # Normalize to syl_tone
        parts = key.split("_")
        if len(parts) >= 2:
            syl_tone = f"{parts[0]}_{parts[1]}"
            unique_combos.add(syl_tone)
            syllables.add(parts[0])

    # Disk size
    disk_bytes = sum(f.stat().st_size for f in AUDIO_DIR.glob("*.mp3")) if AUDIO_DIR.exists() else 0

    return jsonify({
        "total_files": len(tm),
        "speakers": speakers,
        "syllables": len(syllables),
        "unique_combos": len(unique_combos),
        "disk_mb": round(disk_bytes / 1024 / 1024, 1),
        "source": "MSU Tone Perfect (tone.lib.msu.edu)",
        "theoretical": {"syllables": 410, "combos": 1640, "total": 9840},
    })


# ---- API: Full DB (read-only reference data) ----

@app.route("/api/db")
@login_required
def get_db():
    return jsonify(read_db())


# ---- API: Vocabulary CRUD ----

@app.route("/api/vocabulary")
@login_required
def get_vocabulary():
    db = read_db()
    return jsonify(db["vocabulary"])


@app.route("/api/vocabulary", methods=["POST"])
@login_required
def add_vocabulary():
    db = read_db()
    entry = request.json
    entry["id"] = "v" + uuid.uuid4().hex[:8]
    entry.setdefault("isCustom", True)
    entry.setdefault("tone", 0)
    db["vocabulary"].append(entry)
    write_db(db)
    return jsonify(entry), 201


@app.route("/api/vocabulary/<vid>", methods=["PUT"])
@login_required
def update_vocabulary(vid):
    db = read_db()
    for i, v in enumerate(db["vocabulary"]):
        if v["id"] == vid:
            db["vocabulary"][i].update(request.json)
            db["vocabulary"][i]["id"] = vid  # keep original id
            write_db(db)
            return jsonify(db["vocabulary"][i])
    return jsonify({"error": "not found"}), 404


@app.route("/api/vocabulary/<vid>", methods=["DELETE"])
@login_required
def delete_vocabulary(vid):
    db = read_db()
    db["vocabulary"] = [v for v in db["vocabulary"] if v["id"] != vid]
    write_db(db)
    return jsonify({"ok": True})


# ---- API: Progress ----

@app.route("/api/progress")
@login_required
def get_progress():
    return jsonify(read_progress())


@app.route("/api/progress", methods=["PUT"])
@login_required
def update_progress():
    write_progress(request.json)
    return jsonify({"ok": True})


# ---- API: Calendar Events ----

CALENDAR_PATH = DATA_DIR / "calendar.json"


def read_calendar():
    if not CALENDAR_PATH.exists():
        return []
    with open(CALENDAR_PATH, encoding="utf-8") as f:
        return json.load(f)


def write_calendar(data):
    with open(CALENDAR_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def expand_recurring(events, range_start: str, range_end: str):
    """Expand recurring events into individual occurrences within a date range."""
    rs = date.fromisoformat(range_start)
    re_ = date.fromisoformat(range_end)
    result = []

    for ev in events:
        repeat = ev.get("repeat", "none")
        if repeat == "none" or not repeat:
            # One-off event — include if in range
            if ev.get("date") and rs <= date.fromisoformat(ev["date"]) <= re_:
                result.append(ev)
            continue

        # Recurring event
        ev_start = date.fromisoformat(ev.get("date", range_start))
        ev_end = date.fromisoformat(ev["repeatEnd"]) if ev.get("repeatEnd") else re_
        ev_end = min(ev_end, re_)  # clamp to range

        # Exceptions: dates where this recurring event was cancelled
        exceptions = set(ev.get("exceptions", []))

        current = max(ev_start, rs)
        while current <= ev_end:
            dk = current.isoformat()
            include = False

            if repeat == "daily":
                include = True
            elif repeat == "weekly":
                include = current.weekday() == ev_start.weekday()
            elif repeat == "biweekly":
                delta_days = (current - ev_start).days
                include = current.weekday() == ev_start.weekday() and delta_days % 14 < 7
            elif repeat == "monthly":
                include = current.day == ev_start.day

            if include and dk not in exceptions:
                occ = {
                    **ev,
                    "date": dk,
                    "_sourceId": ev["id"],  # link back to parent
                    "_generated": True,
                }
                result.append(occ)

            current += timedelta(days=1)

    return result


@app.route("/api/calendar")
@login_required
def get_calendar():
    """Return calendar events. Use ?from=YYYY-MM-DD&to=YYYY-MM-DD to expand recurring."""
    events = read_calendar()
    range_start = request.args.get("from")
    range_end = request.args.get("to")
    if range_start and range_end:
        return jsonify(expand_recurring(events, range_start, range_end))
    return jsonify(events)


@app.route("/api/calendar/raw")
@login_required
def get_calendar_raw():
    """Return raw stored events (including recurrence rules) without expansion."""
    return jsonify(read_calendar())


@app.route("/api/calendar", methods=["POST"])
@login_required
def add_calendar_event():
    events = read_calendar()
    event = request.json
    event["id"] = "e" + uuid.uuid4().hex[:8]
    events.append(event)
    write_calendar(events)
    return jsonify(event), 201


@app.route("/api/calendar/<eid>", methods=["PUT"])
@login_required
def update_calendar_event(eid):
    events = read_calendar()
    for i, ev in enumerate(events):
        if ev["id"] == eid:
            events[i].update(request.json)
            events[i]["id"] = eid
            write_calendar(events)
            return jsonify(events[i])
    return jsonify({"error": "not found"}), 404


@app.route("/api/calendar/<eid>", methods=["DELETE"])
@login_required
def delete_calendar_event(eid):
    events = read_calendar()
    events = [ev for ev in events if ev["id"] != eid]
    write_calendar(events)
    return jsonify({"ok": True})


# ---- API: Worksheet characters (for generate_worksheets.py) ----

@app.route("/api/characters")
@login_required
def get_characters():
    """Return unique Chinese characters grouped by category, for worksheet generation."""
    db = read_db()
    by_category = {}
    for v in db["vocabulary"]:
        cat = v.get("category", "uncategorized")
        if cat not in by_category:
            by_category[cat] = []
        for ch in v["chinese"]:
            if "\u4e00" <= ch <= "\u9fff" and ch not in by_category[cat]:
                by_category[cat].append(ch)
    return jsonify(by_category)


if __name__ == "__main__":
    print(f"DB: {DB_PATH}")
    print(f"App: {APP_DIR}")
    print(f"Open http://localhost:5000")
    app.run(debug=True, port=5000)

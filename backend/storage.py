"""
SQLite persistence for Vera sessions.

Uses Python's built-in sqlite3 — no new dependency, file-based, works
identically on every machine. The DB file lives at backend/sessions.db.

Public API:
    save_session(session_id, idea_summary, session_state, transcript) -> None
    load_session(session_id) -> dict | None
    list_sessions() -> list[dict]
"""
import json
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "sessions.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Bootstrap: create table if it doesn't exist ───────────────────────────────
with _connect() as _boot:
    _boot.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id         TEXT PRIMARY KEY,
            idea_summary       TEXT,
            session_state_json TEXT,
            transcript_json    TEXT,
            updated_at         TEXT,
            report_json        TEXT
        )
    """)
    # Migration: add report_json column if it doesn't exist on older DBs
    try:
        _boot.execute("ALTER TABLE sessions ADD COLUMN report_json TEXT")
    except sqlite3.OperationalError:
        pass # column already exists

    try:
        _boot.execute("ALTER TABLE sessions ADD COLUMN custom_title TEXT")
    except sqlite3.OperationalError:
        pass # column already exists


# ── Public functions ───────────────────────────────────────────────────────────

def save_session(
    session_id: str,
    idea_summary: str,
    session_state: dict,
    transcript: list,
    report: dict | None = None,
) -> None:
    """Upsert a session row. JSON-encodes session_state, transcript, and report."""
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions
                (session_id, idea_summary, session_state_json, transcript_json, updated_at, report_json)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                idea_summary       = excluded.idea_summary,
                session_state_json = excluded.session_state_json,
                transcript_json    = excluded.transcript_json,
                updated_at         = excluded.updated_at,
                report_json        = excluded.report_json
            """,
            (
                session_id,
                idea_summary,
                json.dumps(session_state, default=str),
                json.dumps(transcript),
                now,
                json.dumps(report) if report else None,
            ),
        )


def load_session(session_id: str) -> dict | None:
    """Return the decoded session row or None if not found."""
    print(f">>> [Step 3] load_session querying DB for session_id: {session_id}", flush=True)
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()

    if row is None:
        print(f">>> [Step 3] load_session: NO ROW FOUND for {session_id}", flush=True)
        return None

    session_state = json.loads(row["session_state_json"] or "{}")
    transcript = json.loads(row["transcript_json"] or "[]")
    
    print(f">>> [Step 4] loaded data: session_state length={len(session_state)}, transcript length={len(transcript)}", flush=True)

    return {
        "session_id":    row["session_id"],
        "idea_summary":  row["idea_summary"],
        "custom_title":  row["custom_title"],
        "session_state": json.loads(row["session_state_json"] or "{}"),
        "transcript":    json.loads(row["transcript_json"]    or "[]"),
        "updated_at":    row["updated_at"],
        "report":        json.loads(row["report_json"]) if row["report_json"] else None,
    }


def list_sessions() -> list[dict]:
    """Return all sessions ordered newest-first."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT session_id, idea_summary, custom_title, updated_at, report_json FROM sessions ORDER BY updated_at DESC"
        ).fetchall()
    
    result = []
    for r in rows:
        d = dict(r)
        d["display_title"] = d["custom_title"] if d.get("custom_title") else d["idea_summary"]
        
        # Extract feasibility score
        d["feasibility_score"] = None
        if d.get("report_json"):
            try:
                report = json.loads(d["report_json"])
                if "feasibility_score" in report:
                    d["feasibility_score"] = report["feasibility_score"]
            except Exception:
                pass
        
        # Remove full report JSON so we don't bloat the list endpoint
        if "report_json" in d:
            del d["report_json"]
            
        result.append(d)
    return result

def delete_session(session_id: str) -> None:
    """Delete a session from the database."""
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))

def rename_session(session_id: str, new_title: str) -> None:
    """Upsert custom_title for a session."""
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (session_id, custom_title, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET custom_title = excluded.custom_title
            """,
            (session_id, new_title, now)
        )

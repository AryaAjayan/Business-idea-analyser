import logging
import traceback
from typing import Optional

from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import storage
from gemini_session import AgentSession
from tools.document_intake import extract_pdf_text, extract_image_summary

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI()

# During local dev, allow your Next.js dev server to connect.
# Tighten this to your actual deployed frontend URL before submission.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global dict to temporarily hold extracted file context before the WS connects
pending_uploads: dict[str, str] = {}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_idea_summary(transcript: list) -> str:
    """Pull the first substantive user message as the idea summary.
    Falls back to Vera's first question, then 'Untitled conversation'."""
    for entry in transcript:
        if entry.get("role") == "user":
            text = entry.get("text", "").strip()
            if len(text) > 20:
                return text[:120]
    for entry in transcript:
        if entry.get("role") == "agent":
            text = entry.get("text", "").strip()
            if len(text) > 10:
                return text[:100]
    return "Untitled conversation"


def _save(session: AgentSession) -> None:
    """Persist the session regardless of how it ended."""
    try:
        summary = _extract_idea_summary(session.transcript)
        storage.save_session(
            session_id=session.session_id,
            idea_summary=summary,
            session_state=session.session_state,
            transcript=session.transcript,
            report=session.session_state.get("report")
        )
        print(f">>> Session {session.session_id[:8]}… saved ({len(session.transcript)} transcript entries)", flush=True)
    except Exception:
        print(">>> WARNING: failed to save session", flush=True)
        traceback.print_exc()


# ── HTTP endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/sessions")
async def list_sessions():
    """Return all past sessions (id, idea_summary, updated_at) for the Resume list."""
    return storage.list_sessions()


@app.get("/sessions/{session_id}/report")
async def get_session_report(session_id: str):
    """Return the final report for a specific session without resuming the full WS."""
    session_data = storage.load_session(session_id)
    if not session_data or not session_data.get("report"):
        raise HTTPException(status_code=404, detail="Report not found for this session.")
    return {"report": session_data["report"]}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a past session."""
    storage.delete_session(session_id)
    return {"status": "ok"}

class RenameRequest(BaseModel):
    title: str

@app.patch("/sessions/{session_id}/title")
async def rename_session(session_id: str, payload: RenameRequest):
    """Rename a session's custom title."""
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Missing title")
    if len(title) > 100:
        raise HTTPException(status_code=400, detail="Title too long (max 100 characters)")
    storage.rename_session(session_id, title)
    return {"status": "ok"}


@app.post("/upload-context")
async def upload_context(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Extract text from an uploaded PDF or image, store temporarily for the session."""
    file_bytes = await file.read()
    extracted_text = ""
    
    try:
        if file.content_type == "application/pdf":
            extracted_text = extract_pdf_text(file_bytes)
        elif file.content_type in ["image/png", "image/jpeg", "image/jpg"]:
            extracted_text = extract_image_summary(file_bytes, file.content_type)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
            
        pending_uploads[session_id] = extracted_text
        print(f">>> Extracted {len(extracted_text)} chars of context for session {session_id[:8]}", flush=True)
        return {"status": "ok", "length": len(extracted_text)}
    except Exception as e:
        print(">>> Failed to extract document context:", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: Optional[str] = Query(None),
):
    await websocket.accept()
    print(f">>> [Step 2 Backend] WEBSOCKET CONNECTED. Received session_id query param: {session_id!r}", flush=True)

    # ── Load existing session if a session_id was provided ──
    existing = None
    if session_id:
        existing = storage.load_session(session_id)
        if existing:
            print(
                f">>> Resuming session {session_id[:8]}… "
                f"({len(existing['transcript'])} transcript entries, "
                f"{len(existing['session_state'])} state keys)",
                flush=True,
            )
        else:
            print(f">>> session_id={session_id!r} not found in DB — starting fresh", flush=True)

    # ── Fetch any pending upload context ──
    # Defaults to empty string if no upload happened for this session
    uploaded_context = pending_uploads.pop(session_id, "") if session_id else ""

    # ── Build the AgentSession ──
    if existing:
        session = AgentSession(
            client_ws=websocket,
            session_id=existing["session_id"],
            session_state=existing["session_state"],
            transcript=existing["transcript"],
            is_resume=True,
            idea_summary=existing["idea_summary"],
            uploaded_context=uploaded_context,
        )
    else:
        session = AgentSession(
            client_ws=websocket,
            session_id=session_id,  # may be None → auto-generated inside __init__
            uploaded_context=uploaded_context,
        )

    try:
        await session.run()
        print(">>> session.run() returned normally", flush=True)
    except WebSocketDisconnect:
        print(">>> Client disconnected (WebSocketDisconnect)", flush=True)
    except Exception:
        print(">>> SESSION CRASHED:", flush=True)
        traceback.print_exc()
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        # Always save — covers clean end, abrupt tab-close, and crashes alike
        _save(session)
# Backend - Voice Business Idea Analyzer

## What's here

- `main.py` — FastAPI app, exposes `/ws` (the WebSocket the frontend connects to) and `/health`
- `gemini_session.py` — manages one Gemini Live API session per client, relays audio, handles tool calls
- `schemas.py` — shared data shapes (mirror these in the frontend's `lib/types.ts`)
- `tools/` — the 6 real tool functions (search, calculators, SWOT, report)

## Setup (run these on your own machine, not in a sandbox)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # on Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Then open `.env` and paste in:
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey (the same free key you already created)
- `TAVILY_API_KEY` — optional, free tier at https://tavily.com (1,000 searches/month). If you skip this, `search_market_data` will return a clearly-labeled stub result instead of crashing, so you can still test everything else.

## Run it

```bash
uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/health` — you should see `{"status": "ok"}`. That confirms the server itself is running correctly.

## Testing the actual WebSocket / Live API connection

This needs a real client sending real audio — that's the frontend we build next. Once that's connected and pointed at `ws://localhost:8000/ws`, this is where you'll find out if the Live API round-trip genuinely works end to end.

If you want to sanity-check the backend alone before the frontend exists, you can use a simple WebSocket testing tool (like `websocat` or Postman's WebSocket support) to connect to `ws://localhost:8000/ws` and send a message like:
```json
{"type": "end"}
```
This should cleanly close the session without errors — a good first signal the server isn't crashing on startup.

## Known things to watch for

- **Model name**: `gemini-3.1-flash-live-preview` is hardcoded in `gemini_session.py`. Since it's a preview model, if Google renames or deprecates it before your deadline, update `MODEL_NAME` at the top of that file — check https://aistudio.google.com for the current name in the model dropdown.
- **SDK method names**: this uses the `google-genai` Python SDK's async Live API (`client.aio.live.connect`). This is an actively evolving preview API — if you hit an `AttributeError` on something like `send_realtime_input` or `send_tool_response`, check the latest docs at https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk since method signatures can shift.
- **Audio format**: the code assumes 16kHz PCM audio coming from the browser, base64-encoded inside a JSON message like `{"type": "audio", "data": "<base64>"}`. The frontend's `useAudioStream` hook needs to actually produce this exact format — that's the next piece to build.
- **CORS**: currently wide open (`allow_origins=["*"]`) for local development. Fine for your deadline, but worth tightening to your actual deployed frontend URL if you have time.

# Frontend - Business Idea Analyzer

## What's here

- `app/page.tsx` — main screen, wires the mic hook + WebSocket hook + all visual components together
- `hooks/useAudioStream.ts` — captures your mic, converts it to the exact PCM format the backend expects
- `hooks/useAgentSocket.ts` — connects to the backend, plays Vera's voice back, handles instant interruption
- `components/` — VoiceOrb, TranscriptStream, AgentWorkspace, InvestorSnapshot
- `lib/types.ts` — shared shapes, mirrors `backend/schemas.py` exactly

## How this connects to the backend

`useAgentSocket` opens a WebSocket to whatever URL is in `NEXT_PUBLIC_WS_URL` (see `.env.local` — defaults to `ws://localhost:8000/ws`). That means:

1. Your **backend must already be running** (`uvicorn main:app --reload --port 8000`) before you start this.
2. This frontend and that backend are two separate things running in two separate terminals at the same time. Neither one works alone.

## Setup

```bash
cd frontend
npm install
```

`.env.local` is already set up pointing at `localhost:8000` — no changes needed for local testing.

## Run it

```bash
npm run dev
```

Open `http://localhost:3000`. Click "Start talking to Vera," allow microphone access, and talk.

## Testing checklist, in order

1. **Backend running first** — check `http://localhost:8000/health` shows `{"status": "ok"}` before touching the frontend at all.
2. **Frontend loads** — `http://localhost:3000` shows the orb and the "Start talking to Vera" button, no console errors on load.
3. **Mic permission works** — clicking the button prompts for mic access in the browser.
4. **Orb reacts** — talk, and the orb should visibly pulse (this proves `useAudioStream` amplitude detection is working, independent of whether the backend/Gemini connection works yet).
5. **You hear a response** — this is the real end-to-end test: your voice → backend → Gemini → back → your speakers.
6. **Interrupt works** — talk over Vera mid-sentence, she should stop instantly, not finish her sentence (this is the exact bug we saw in AI Studio's own test player — this frontend explicitly fixes it by flushing the audio queue the moment an "interrupted" message arrives).
7. **Agent workspace panel fills in** — as tools get called, cards should appear on the right side of the screen.
8. **Final report renders** — once Vera calls `compile_investor_report`, the InvestorSnapshot component with charts should appear at the bottom.

## Known things to watch for

- **Browser mic permissions**: if nothing happens when you click the button, check your browser didn't silently block the mic permission prompt (look for a blocked-mic icon in the address bar).
- **ScriptProcessorNode deprecation**: `useAudioStream` uses `ScriptProcessorNode`, which browsers have marked deprecated but still fully support. It was chosen over the more "correct" AudioWorklet approach because it's simpler and more reliable to get working under a tight deadline. Not worth changing before your submission.
- **CORS**: the backend currently allows all origins (`*`) for local dev — that's why this works out of the box. If you deploy the backend somewhere and don't update its CORS settings, the deployed frontend won't be able to connect.
- **`sharp`/image-optimization vulnerabilities**: `npm audit` will show some remaining high-severity warnings tied to Next's built-in image optimizer. This app doesn't use `next/image` at all, so they're not actually exploitable here — not worth chasing a Next.js 16 upgrade this close to your deadline.
- **Deploying later**: when you deploy to Vercel, set `NEXT_PUBLIC_WS_URL` in Vercel's environment variables to your deployed backend's WebSocket URL (`wss://your-backend.onrender.com/ws`, note `wss` not `ws` for a secure connection).

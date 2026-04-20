# Interview Taker — Frontend

React + Vite + TypeScript + Tailwind v4 UI for the voice interview agent.

## What it does

Three screens:

1. **Setup** — collect candidate name, JD, and resume.
2. **Live Interview** — connects to LiveKit, publishes the mic, shows the
   agent's voice visualizer + a live merged transcript.
3. **Evaluation** — renders the structured `InterviewEvaluation` JSON the
   agent delivers via RPC after it says goodbye.

## Run locally

You need the agent + token server running too. From the project root:

```bash
# 1. Install + run the LiveKit agent (terminal 1)
uv sync
uv run agent.py download-files     # one-time
uv run agent.py dev                # connects to LiveKit Cloud as a worker

# 2. Run the token server (terminal 2)
uv run token_server.py             # http://localhost:8000

# 3. Run the frontend (terminal 3)
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Open http://localhost:5173, paste a JD + resume (or leave blank to use the
defaults), and click **Start interview**.

## How the pieces talk

```
React UI ──POST /api/connection-details──▶ token_server.py (FastAPI)
        ◀───── { server_url, jwt, room_name } ─────
        │
        │  WebRTC (token JWT carries explicit agent dispatch
        │  for "ml-interviewer" + room metadata: JD / resume / name)
        ▼
LiveKit Cloud ──dispatch──▶ agent.py worker
        │
        │  voice ↔ voice (Deepgram STT + Gemini LLM + Gemini TTS)
        │
        │  When agent calls end_interview tool & finishes goodbye:
        │  agent → room.local_participant.perform_rpc(
        │             method="interview.evaluation",
        │             payload=<InterviewEvaluation JSON>)
        ▼
React UI registers RPC handler → renders the evaluation screen.
```

## Tech notes

- `@livekit/components-react` provides `RoomContext`, `useVoiceAssistant`,
  `useTranscriptions`, and `BarVisualizer`.
- The dev server proxies `/api/*` to `localhost:8000` (see `vite.config.ts`),
  so the same code works in production behind any reverse proxy without
  CORS gymnastics.
- Tailwind v4 is wired via `@tailwindcss/vite` — no `postcss.config.js`,
  no `tailwind.config.js`. All theming lives in `src/index.css`.

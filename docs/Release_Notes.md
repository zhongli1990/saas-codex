# Release Notes

## v0.1.0 — Initial Demo

Release name: **initial demo**

### Highlights

- End-to-end demo workflow available through the web UI.
- Repository session creation by cloning a public Git URL.
- Prompt execution powered by `@openai/codex-sdk` (Codex CLI under the hood).
- Streaming events surfaced end-to-end via SSE (runner -> backend -> frontend).

### Features

- Frontend (Next.js)
  - SaaS-style app shell (sidebar + top nav) with placeholder pages.
  - `/codex` page to:
    - create a session from a repo URL
    - run a prompt
    - view a streaming event log
  - Next.js `/api/*` routes proxy requests to backend services.

- Backend (FastAPI)
  - `POST /api/sessions` clones the provided repository into `/workspaces/<session_id>/repo`.
  - `POST /api/sessions/{session_id}/prompt` starts a run in the runner.
  - `GET /api/runs/{run_id}/events` proxies the runner SSE stream.

- Runner (Node)
  - HTTP service that hosts Codex threads and runs.
  - Uses `@openai/codex-sdk` and streams structured events.

- Docker Compose
  - One-command startup for frontend/backend/runner/postgres.
  - Default ports:
    - frontend: 9100
    - backend: 9101
    - runner: 9102
    - postgres: 9103

### Configuration

- `.env` at repo root:
  - `CODEX_API_KEY=...`

### Notes / Known limitations

- Sessions and runs are stored in memory (no persistence across restarts).
- Repository access currently assumes public git URLs.
- The runner is configured for Docker execution using a Codex config that sets a permissive sandbox mode; production usage should add stricter isolation and governance controls.

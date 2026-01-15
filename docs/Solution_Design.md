# Solution / Implementation Design (saas-codex)

## 1. Architecture summary

This repository is a small monorepo deployed via Docker Compose:

- `frontend/` (Next.js App Router)
  - Presents the SaaS dashboard UI.
  - Proxies browser requests through Next.js API routes (`/api/*`).

- `backend/` (FastAPI)
  - Owns session lifecycle:
    - clones repositories
    - stores in-memory session mapping (MVP)
  - Proxies prompt/run operations to the runner.
  - Proxies runner event stream to the browser via SSE.

- `runner/` (Node + `@openai/codex-sdk`)
  - Hosts HTTP endpoints that:
    - create Codex threads bound to a workspace directory
    - start streamed runs
    - serve SSE event streams to subscribers
  - Uses the **Codex CLI** under the hood.

- `postgres` (Postgres 16)
  - Present for future persistence needs.
  - Not used heavily in the MVP code paths yet.

## 2. Runtime topology (docker-compose)

Default host ports:
- Frontend: `http://localhost:9100`
- Backend: `http://localhost:9101`
- Runner: `http://localhost:9102`
- Postgres: `localhost:9103`

Container internal URLs:
- Frontend calls backend via `BACKEND_URL=http://backend:8080`.
- Backend calls runner via `RUNNER_URL=http://runner:8081`.

## 3. Data flow

### 3.1 Create session
1. UI calls `POST /api/sessions` (Next.js route)
2. Next.js proxies to backend `POST /api/sessions`
3. Backend:
   - creates `session_id`
   - clones git repo into `/workspaces/<session_id>/repo`
   - calls runner `POST /threads` with `workingDirectory=/workspaces/<session_id>/repo`
4. Backend returns `{ session_id, repo_path, thread_id }` to UI

### 3.2 Run prompt
1. UI calls `POST /api/sessions/{session_id}/prompt`
2. Backend forwards to runner `POST /runs` with `{ threadId, prompt }`
3. Runner:
   - starts `thread.runStreamed(prompt)`
   - publishes events to an in-memory run buffer
4. Backend returns `{ run_id }`

### 3.3 Stream events (SSE)
1. UI opens `GET /api/runs/{run_id}/events` with `EventSource`
2. Next.js proxies to backend `GET /api/runs/{run_id}/events`
3. Backend streams bytes from runner `GET /runs/{run_id}/events`

## 4. Key implementation details

### 4.1 Workspace safety
- Backend ensures workspace path is under `WORKSPACES_ROOT`.
- Runner also validates `workingDirectory` under `WORKSPACES_ROOT`.

### 4.2 Codex CLI requirements in containers
- `@openai/codex-sdk` spawns the Codex CLI binary.
- The runner image installs:
  - `ca-certificates` for TLS
  - `@openai/codex` globally
  - `/root/.codex/config.toml` to configure sandbox behavior

### 4.3 Sandbox behavior in Docker
- Codex uses Landlock/seccomp sandboxing on Linux.
- In containerized environments this sandbox may fail.
- The runner uses a Codex config file (`runner/codex-config.toml`) with:
  - `sandbox_mode = "danger-full-access"`
  - `approval_policy = "never"`

This relies on Docker as the isolation boundary.

### 4.4 State management (MVP)
- Backend stores sessions in memory (`_sessions` dict).
- Runner stores:
  - `threads` in memory
  - `runs` in memory (with buffered SSE lines)

Production design will require persistence and cleanup.

## 5. API contracts

Backend (public within compose):
- `GET /health`
- `POST /api/sessions { repo_url }`
- `POST /api/sessions/{session_id}/prompt { prompt }`
- `GET /api/runs/{run_id}/events` (SSE)

Runner (internal within compose):
- `GET /health`
- `POST /threads { workingDirectory, skipGitRepoCheck }`
- `POST /runs { threadId, prompt }`
- `GET /runs/{runId}/events` (SSE)

Frontend API routes:
- `POST /api/sessions`
- `POST /api/sessions/[sessionId]/prompt`
- `GET /api/runs/[runId]/events`

## 6. Security considerations

- Secrets
  - `CODEX_API_KEY` must be provided via `.env` and must never be committed.
- Git
  - `workspaces/` should not be committed.
- Sandbox
  - Using `danger-full-access` increases the importance of Docker isolation and least-privilege container configuration.

## 7. Future evolution

- Persist sessions/runs in Postgres.
- Add private repo access via GitHub App / deploy keys.
- Add tenant context + auth.
- Add diff visualization and patch apply workflow.

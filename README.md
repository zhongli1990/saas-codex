# saas-codex

saas-codex is a **SaaS agentic AI platform** for automated analysis and implementation of **healthcare integrations**.

The long-term vision is to provide an "integration engineering copilot" that can:
- ingest integration repositories (FHIR / HL7 v2 / X12 / proprietary)
- perform structured analysis and impact assessment
- implement changes with traceable diffs
- validate and document integration behavior
- operate safely under policy controls and audit logging

This repository currently includes a working end-to-end MVP:
- Web UI (Next.js) with a Codex page
- Backend (FastAPI) that manages sessions and streaming
- Runner (Node + `@openai/codex-sdk`) that drives the Codex agent and streams events

## Quickstart (Docker Compose)

### Prerequisites
- Docker Desktop
- An OpenAI API key with access for Codex SDK usage

### Configure environment
Create `.env` at repo root:

```
CODEX_API_KEY=your_key
```

### Run

```
docker compose up --build
```

Open:
- Frontend: `http://localhost:9100`
- Backend health: `http://localhost:9101/health`
- Runner health: `http://localhost:9102/health`

## Using the Codex UI

1. Open `http://localhost:9100/codex`
2. Paste a public repository URL (example: `https://github.com/octocat/Hello-World`)
3. Click "Create session (clone)"
4. Enter a prompt
5. Click "Run prompt"
6. Watch the event stream update in real time

## Repository layout

- `frontend/` Next.js App Router UI
- `backend/` FastAPI service (session management + SSE proxy)
- `runner/` Node service that hosts Codex threads/runs and SSE events
- `docs/` product + architecture documentation

## Documentation

- `docs/Product_Requirements.md`
- `docs/Solution_Design.md`
- `docs/Dev_Environment.md`

## Security notes

- Do not commit `.env`.
- `workspaces/` contains cloned repos and run artifacts and is intentionally ignored.

## Status

- MVP: repo URL -> session -> prompt -> SSE events is operational.
- Roadmap: tenant/auth, project/session persistence, healthcare-specific analysis modules, governance.

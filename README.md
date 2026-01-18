# saas-codex

saas-codex is a **SaaS agentic AI platform** for automated analysis and implementation of **healthcare integrations**.

The long-term vision is to provide an "integration engineering copilot" that can:
- ingest integration repositories (FHIR / HL7 v2 / X12 / proprietary)
- perform structured analysis and impact assessment
- implement changes with traceable diffs
- validate and document integration behavior
- operate safely under policy controls and audit logging

## Current Release: v0.2.0 (dev branch)

This release includes:
- **Multi-runner support**: Codex (OpenAI) and Claude (Anthropic) agents
- **Workspace registry**: Import and manage workspaces (GitHub URL or local path)
- **Session management**: Create, list, and continue sessions per workspace
- **Transcript UI**: Markdown rendering with tool call display
- **SSE streaming**: Reliable event streaming with anti-buffering
- **Persistence schema**: PostgreSQL tables for workspaces, sessions, runs, events
- **Microservices**: Prompt Manager, Evaluation, Memory, LLM Gateway (placeholders)

## Quickstart (Docker Compose)

### Prerequisites
- Docker Desktop
- API keys for the runners you want to use

### Configure environment
Create `.env` at repo root:

```
CODEX_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Run

```
docker compose up --build
```

### Service URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:9100 | 9100 |
| Backend | http://localhost:9101 | 9101 |
| Codex Runner | http://localhost:9102 | 9102 |
| Claude Runner | http://localhost:9104 | 9104 |
| Postgres | localhost:9103 | 9103 |
| Prompt Manager | http://localhost:9105 | 9105 |
| Evaluation | http://localhost:9106 | 9106 |
| Memory | http://localhost:9107 | 9107 |
| LLM Gateway | http://localhost:9108 | 9108 |

## Using the Agent Console

1. Open `http://localhost:9100/codex`
2. Paste a public repository URL (example: `https://github.com/octocat/Hello-World`)
3. Select a runner (Codex or Claude)
4. Click "Create Session"
5. Enter a prompt
6. Click "Run Prompt"
7. Watch the transcript update in real time
8. Toggle "Raw Events" to see the underlying SSE stream

## Repository layout

```
├── frontend/          Next.js App Router UI
├── backend/           FastAPI service (session management + SSE proxy)
├── runner/            Codex runner (Node + @openai/codex-sdk)
├── claude-runner/     Claude runner (Python + Anthropic SDK)
├── prompt-manager/    Prompt template service
├── evaluation/        Evaluation service (LangSmith-ready)
├── memory/            Memory service (session + workspace scoped)
├── llm-gateway/       Unified LLM API gateway
├── tests/             E2E tests
└── docs/              Product + architecture documentation
```

## Documentation

- `docs/Product_Requirements.md` - Original product requirements
- `docs/Product_Requirements_v0.2.0.md` - v0.2.0 requirements
- `docs/v0.2.0_Implementation_Plan.md` - Detailed implementation plan
- `docs/Solution_Design.md` - Architecture overview
- `docs/Frontend_UI_Plan.md` - UI development plan
- `docs/Dev_Environment.md` - Development setup

## Running Tests

```bash
cd tests
pip install -r requirements.txt
python test_sse_streaming.py --runner codex
python test_sse_streaming.py --runner claude
```

## Database Migrations

```bash
cd backend
alembic upgrade head
```

## Security notes

- Do not commit `.env`.
- `workspaces/` contains cloned repos and run artifacts and is intentionally ignored.
- API keys are passed via environment variables only.

## Status

- **v0.2.0 (dev branch)**: Multi-runner, workspace registry, session management, transcript UI
- **Roadmap**: tenant/auth, Postgres persistence integration, healthcare-specific analysis modules, governance

# saas-codex

saas-codex is a **SaaS agentic AI platform** for automated analysis and implementation of **healthcare integrations**.

The long-term vision is to provide an "integration engineering copilot" that can:
- ingest integration repositories (FHIR / HL7 v2 / X12 / proprietary)
- perform structured analysis and impact assessment
- implement changes with traceable diffs
- validate and document integration behavior
- operate safely under policy controls and audit logging

## Current Release: v0.2.6 (dev/v0.2.0 branch)

### v0.2.6 (Latest - Jan 18, 2026)
- **Click-to-Load Run History**: Click run history items to load prompt and response
- **Visual Feedback**: Selected run highlighted with blue background/border
- **New Endpoint**: `GET /api/runs/{run_id}/detail` for fetching persisted run data

### v0.2.5 (Jan 18, 2026)
- **Shared App Context**: State persists across tab switches (Chat ↔ Codex)
- **Sidebar Navigation Fix**: Active tab highlight follows clicks properly
- **Thread Recovery**: Auto-recreate expired runner threads after container restart
- **Codex Message Persistence**: Codex prompts/responses now saved to database
- **Bug fixes**: Chat UI event parsing, 502 errors on stale sessions

### v0.2.4 (Jan 18, 2026)
- **Enterprise Chat UI**: Dedicated `/chat` page with ChatGPT/Claude-style interface
- **Message persistence**: All conversations saved to database with history loading
- **Syntax highlighting**: Prism code blocks with dark theme
- **Tool call cards**: Collapsible cards showing tool input/output
- **Real-time streaming**: Typing indicator during AI response

### v0.2.3 (Jan 18, 2026)
- **Real-time workspace sync**: Dropdown reflects actual filesystem state
- **Cache bypass**: All API routes use `cache: no-store` for fresh data
- **Orphan handling**: Workspaces with deleted folders automatically hidden

### v0.2.2 (Jan 18, 2026)
- **Local folder scan**: Discover unregistered folders in `/workspaces`
- **Local folder import**: Register manually copied folders with custom names
- **Scan UI**: Modal to view discovered folders with git info and bulk import

### v0.2.1 (Jan 18, 2026)
- **Database integration**: PostgreSQL persistence with repository pattern
- **Workspace auto-import**: Scans `/workspaces` on startup
- **Transcript parsing**: Fixed to handle Codex event types
- **CSS fix**: Static assets for standalone Docker mode

### v0.2.0 (Base)
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
2. **Import a workspace**:
   - Click "+ Import" and paste a GitHub URL, OR
   - Click "🔍 Scan" to discover local folders in `/workspaces`
3. Select a workspace from the dropdown
4. Select a runner (Codex or Claude)
5. Click "New Session" or continue an existing session
6. Enter a prompt
7. Click "Run Prompt"
8. Watch the transcript update in real time
9. Toggle "Raw Events" to see the underlying SSE stream

### Adding Local Projects

To work with a local project:

```bash
# Create the workspace structure
mkdir -p workspaces/my-project/repo

# Copy your project files
cp -r /path/to/your/project/* workspaces/my-project/repo/

# In the UI: Click "🔍 Scan" → Select folder → Import
```

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

- **v0.2.4 (current)**: Enterprise Chat UI, message persistence, syntax highlighting
- **v0.2.3**: Real-time workspace sync, cache bypass, orphan handling
- **v0.2.2**: Local folder scan/import, database integration complete
- **v0.2.1**: Transcript parsing fix, CSS fix, workspace auto-import
- **v0.2.0**: Multi-runner, workspace registry, session management, transcript UI
- **Roadmap**: v0.3.0 (authentication, RBAC, clinical workflows), v0.4.0 (multi-agent, lifecycle automation)

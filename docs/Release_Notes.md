# Release Notes

## v0.6.1 — Runner Selection Fix + Feature Verification (Feb 8, 2026)

Release name: **hotfix + verification**

**Status**: ✅ Released  
**Tag**: `v0.6.1`

### Bug Fix

**Issue**: When user selected "Claude Agent" from the dropdown and created a session, the session was always stored as `codex` in the database, causing all requests to go to the OpenAI Codex runner instead of Claude.

**Root Cause**: `useState` initialized `runnerType` to `"codex"` and localStorage was loaded asynchronously via `useEffect`, causing a race condition where the session was created before the localStorage value was applied.

**Fix**:
- `AppContext.tsx`: Use lazy initialization with `getInitialRunnerType()` to load from localStorage synchronously during initial render
- `codex/page.tsx`: Remove `useEffect` that auto-synced runner type from session (was overwriting user's dropdown selection)

### Feature Implementation Status

| Feature | Status | Verified |
|---------|--------|----------|
| Claude Agent SDK Migration | ✅ Done | ✅ `claude-agent-sdk>=0.1.30` available in container |
| Skills System (global + workspace) | ✅ Done | ✅ 3 global skills loaded |
| Hooks (pre-tool-use validation) | ✅ Done | ✅ Blocks dangerous commands |
| Global Skills Created | ✅ Done | ✅ `code-review`, `security-audit`, `healthcare-compliance` |
| UI/UX Streaming Events | ✅ Done | ✅ New event types handled |
| Transcript Rendering | ✅ Done | ✅ Skill badges, iteration bars, blocked styling |

### How to Test

#### 1. Runner Switching
```bash
# Verify Claude session stored correctly
docker compose exec -T postgres psql -U saas -d saas -c \
  "SELECT id, runner_type FROM sessions ORDER BY created_at DESC LIMIT 3;"
```

#### 2. Skills System
```bash
# Check global skills are loaded
docker compose exec -T claude-runner ls -la /app/skills/
# Expected: code-review/, security-audit/, healthcare-compliance/
```

#### 3. Hooks (Dangerous Command Blocking)
- Run prompt: `"Execute: rm -rf /"`
- **Expected**: Red "🚫 BLOCKED" message with reason

#### 4. UI Streaming Events
- Run any prompt with Claude runner
- **Expected**: Purple skill badges, iteration progress bars

### Verified

- ✅ Database correctly stores `runner_type: 'claude'` for Claude sessions
- ✅ Claude-runner logs show `POST /threads`, `POST /runs`, `GET /runs/.../events`
- ✅ E2E test successful with Claude response
- ✅ Skills loaded from `/app/skills/` directory
- ✅ Hooks block dangerous bash patterns

---

## v0.6.0 — Claude Agent SDK Uplift (Feb 7, 2026)

Release name: **agent sdk**

**Status**: ✅ Released  
**Tag**: `v0.6.0`

### Highlights

- Migrate Claude runner to official `claude-agent-sdk` (with Anthropic SDK fallback)
- Claude Skill files (global + per-workspace)
- Pre/post tool use hooks for validation and security
- True E2E streaming in UI with new event types
- **No impact on existing OpenAI Codex runner** — both runners are plug-and-play interchangeable

### Features

- **Claude Agent SDK Migration**
  - Replace `anthropic` SDK with `claude-agent-sdk>=0.1.30`
  - Fallback to basic Anthropic SDK if Agent SDK unavailable
  - Built-in agent loop with typed messages
  - Native streaming and session management

- **Claude Skill Files**
  - Global skills: `claude-runner/skills/*/SKILL.md` (bundled in Docker image)
  - Workspace skills: `{workspace}/.claude/skills/*/SKILL.md`
  - Built-in skills: `code-review`, `security-audit`, `healthcare-compliance`
  - YAML frontmatter for skill metadata (name, description, allowed-tools)

- **Pre/Post Tool Hooks**
  - PreToolUse: Block dangerous bash commands (`rm -rf`, `sudo`, `curl | sh`, etc.)
  - PreToolUse: Block path traversal (`..` in file paths)
  - PostToolUse: Audit logging with timestamps
  - Configurable via `ENABLE_HOOKS` environment variable

- **UI/UX E2E Streaming**
  - New SSE events: `ui.skill.activated`, `ui.iteration`, `ui.tool.blocked`
  - Skill activation badges in transcript (purple)
  - Iteration progress bar
  - Blocked tool highlighting (red)
  - Collapsible tool input/output sections with max-height

- **Authentication**
  - API key authentication via `ANTHROPIC_API_KEY` (**recommended**)
  - Cloud provider support: AWS Bedrock, Google Vertex AI, Microsoft Azure
  - ⚠️ Browser login / OAuth **not supported** for third-party apps (Anthropic policy)

### Files Changed

| File | Change |
|------|--------|
| `claude-runner/requirements.txt` | Added `claude-agent-sdk`, `pyyaml`, `anyio` |
| `claude-runner/app/agent.py` | Rewritten with SDK support + fallback |
| `claude-runner/app/skills.py` | New skill loader module |
| `claude-runner/app/hooks.py` | New pre/post tool validation module |
| `claude-runner/app/config.py` | Added `GLOBAL_SKILLS_PATH`, `ENABLE_HOOKS`, `MAX_AGENT_TURNS` |
| `claude-runner/Dockerfile` | Copies skills directory, sets env vars |
| `claude-runner/skills/*/SKILL.md` | 3 global skill files |
| `frontend/.../codex/page.tsx` | Extended transcript types, new event handling |
| `frontend/.../chat/page.tsx` | Extended metadata types, new event handling |

### Regression Testing

✅ **OpenAI Codex runner**: Completely untouched, no changes to `runner/src/server.ts`  
✅ **Backend API**: No changes to runner dispatch logic  
✅ **Frontend runner switching**: Works correctly for both `codex` and `claude`  
✅ **SSE event handling**: Both event formats handled in transcript parsing  
✅ **Docker build**: `docker compose build claude-runner` succeeds

See `v0.6.0_Claude_Agent_SDK_Design.md` for full specification.

---

## v0.5.1 — File Upload & Browser (Feb 6, 2026)

Release name: **file management**

### Highlights

- Upload local folders directly from browser to create workspaces
- Browse, view, and download workspace files
- RBAC model for multi-tenant file access
- Documented AWS/production DB migration recovery steps for `users.tenant_id` / missing `alembic_version` (see `Service_Guide.md` -> Migrations)

### Features

- **Local Folder Upload**
  - 📤 Upload button in Agents Tab workspace panel
  - Browser-side ZIP compression using JSZip (up to 1GB)
  - Automatic workspace registration after upload

- **File Browser & Download**
  - 📁 Files tab in Agents Tab Output panel
  - 📁 Files panel in Chat UI sidebar
  - Directory navigation with breadcrumbs
  - In-browser file viewing (text, code, markdown)
  - Single file download
  - Folder download as ZIP

- **Backend API Endpoints**
  - `GET /api/workspaces/{id}/files` - List directory contents
  - `GET /api/workspaces/{id}/files/view` - View file content
  - `GET /api/workspaces/{id}/files/download` - Download single file
  - `GET /api/workspaces/{id}/files/download-zip` - Download folder as ZIP
  - `POST /api/workspaces/{id}/files/upload` - Upload file to workspace
  - `POST /api/workspaces/upload` - Upload zipped folder as new workspace

- **RBAC Enhancements**
  - New tables: `tenants`, `groups`, `user_groups`, `workspace_access`
  - Multi-tenant model for NHS Trust organizations
  - Workspace ownership tracking (`owner_id`)

See `File_Management_Design.md` and `File_Management_Requirements.md` for current specs.

### Dependencies Added

- `jszip` (frontend) - Browser-side ZIP compression
- `python-multipart` (backend) - File upload support

---

## v0.4.0 — Authentication & RBAC (Jan 19, 2026)

Release name: **auth foundation**

### Highlights

- User authentication with JWT tokens
- Role-based access control (admin/user)
- Simplified Agents workflow

### Features

- Login/logout with email/password
- Protected routes requiring authentication
- Admin user management
- Workspace removal with confirmation
- Codex skip git trust check for local folders

---

## v0.3.0 — UI Tab Uplift (Jan 18, 2026)

Release name: **dashboard uplift**

### Highlights

- Dashboard, Projects, Settings tabs redesigned
- Dark mode support
- Renamed Codex to Agents

---

## v0.2.0 — Multi-Runner & Chat UI (Jan 2026)

Release name: **multi-runner**

### Highlights

- Support for multiple AI runners (Codex + Claude)
- Enterprise Chat UI with message persistence
- Workspace registry with local folder scan/import
- Real-time workspace sync

---

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

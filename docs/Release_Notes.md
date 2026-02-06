# Release Notes

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

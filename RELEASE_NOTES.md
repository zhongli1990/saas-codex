# Release Notes

## v0.2.3 (Jan 18, 2026)

### Real-Time Workspace Sync

This release ensures the workspace dropdown always reflects the actual filesystem state.

#### Features
- **Real-time sync**: Dropdown filters out workspaces whose folders have been deleted
- **Cache bypass**: All frontend API routes use `cache: no-store` for fresh data
- **Orphan handling**: Workspaces with missing folders are automatically hidden

#### Bug Fixes
- Fixed Next.js caching issue causing stale workspace list after import
- Fixed dropdown not updating after local folder import

#### Technical Changes
- Backend `/api/workspaces` now checks `pathlib.Path(ws.local_path).exists()` before including workspace
- Frontend API proxy routes updated with `cache: "no-store"`

---

## v0.2.2 (Jan 18, 2026)

### Local Folder Import

This release adds the ability to import manually copied project folders.

#### Features
- **Scan Local**: New button to discover unregistered folders in `/workspaces`
- **Import Modal**: View discovered folders with git info and bulk import
- **Custom Names**: Set display names during import
- **Git Detection**: Automatically detects git repos and extracts remote URL

#### New Endpoints
- `GET /api/workspaces/scan` - Discover unregistered folders
- `POST /api/workspaces/import-local` - Register local folder as workspace

#### Usage
```bash
# Copy any project to workspaces
mkdir -p workspaces/my-project/repo
cp -r /path/to/project/* workspaces/my-project/repo/

# In UI: Click "🔍 Scan" → Select folder → Import
```

---

## v0.2.1 (Jan 18, 2026)

### Database Integration & Fixes

#### Features
- **PostgreSQL persistence**: Repository pattern with SQLAlchemy async ORM
- **Workspace auto-import**: Scans `/workspaces` on startup
- **Session continuation**: UI to select and continue existing sessions

#### Bug Fixes
- Fixed transcript parsing for Codex event types (`item.completed`, `command_execution`)
- Fixed CSS static assets for standalone Docker mode

---

## v0.2.0 (Jan 2026)

### Multi-Runner Support

Initial v0.2.0 release with multi-runner architecture.

#### Features
- **Codex Runner**: OpenAI Codex agent with SSE streaming
- **Claude Runner**: Anthropic Claude agent with tool use
- **Workspace Registry**: Import and manage GitHub repositories
- **Session Management**: Create, list, and continue sessions
- **Transcript UI**: Markdown rendering with tool call display
- **SSE Streaming**: Reliable event streaming with anti-buffering

#### Microservices (Placeholders)
- Prompt Manager
- Evaluation Service
- Memory Service
- LLM Gateway

---

## Upgrade Notes

### From v0.2.2 to v0.2.3
No breaking changes. Rebuild frontend container to get cache bypass fix.

### From v0.2.1 to v0.2.2
No breaking changes. New scan/import features are additive.

### From v0.2.0 to v0.2.1
Database migration required:
```bash
cd backend
alembic upgrade head
```

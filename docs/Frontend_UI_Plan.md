# Frontend UI Development Plan (SaaS Dashboard)

## Goals
Build a production-oriented SaaS UI for the Codex-driven coding workflow.

The UI should support:

- Authentication and tenant context (Org/Team) as first-class concepts
- A dashboard shell (sidebar + top bar) with consistent navigation
- Project and session management
- A streaming “run” experience (events, tool output, diffs)
- Settings placeholders for integrations (Git providers), billing, and security

## Research summary (open-source references)
The following open-source references are good fits for a Next.js App Router SaaS UI.

- shadcn/ui Dashboard Example
  - https://ui.shadcn.com/examples/dashboard
  - Strong baseline layout patterns and information hierarchy

- next-shadcn-dashboard-starter (Kiranism)
  - https://github.com/Kiranism/next-shadcn-dashboard-starter
  - Useful for folder structure, dashboard navigation patterns

- SaaS-Boilerplate (ixartz)
  - https://github.com/ixartz/SaaS-Boilerplate
  - Broad “SaaS completeness” checklist (auth, teams, roles), good for roadmap

- next-saas-stripe-starter (mickasmt)
  - https://github.com/mickasmt/next-saas-stripe-starter
  - Good reference for role-based admin vs user dashboards and billing integration patterns

- nextjs/saas-starter
  - https://github.com/nextjs/saas-starter
  - Reference for how Next.js expects typical SaaS scaffolding (auth, dashboard, billing)

## Chosen approach for this repo
We will uplift the current frontend with:

- TailwindCSS for consistent styling and layout
- A SaaS “App Shell” (sidebar + top navigation)
- Route groups for app vs auth pages
- Placeholder pages wired to backend endpoints where possible

If/when you want the full shadcn/ui component set, we will add it after Phase 1 so the foundation (routing + information architecture) is stable.

## Information architecture (routes)

- /(auth)
  - /login

- /(app)
  - /dashboard
  - /projects
  - /codex (existing workflow, uplifted)
  - /settings

## UI feature roadmap

### Phase 1 — SaaS shell + navigation + placeholders (start now)
Deliver a UI that looks and behaves like a SaaS dashboard, while keeping existing functionality.

- App shell
  - Sidebar navigation
  - Top nav with tenant placeholder + user menu placeholder
  - Responsive layout (desktop first, mobile later)

- Pages
  - Dashboard page (placeholder KPIs)
  - Projects page (placeholder list; later becomes real)
  - Settings page (placeholders for integrations and billing)
  - Codex page (existing flow, improved layout + streaming view)
  - Login page placeholder

Acceptance criteria:

- Navigating between pages preserves the app shell
- The Codex page remains functional
- Basic visual consistency (spacing, typography, hierarchy)

### Phase 2 — Auth + tenant context (backend coordination)
- Auth integration strategy (Auth.js, OIDC, or FastAPI JWT)
- Org/team selector and tenant-scoped navigation
- Persist “current project” and “current session” in the UI

Acceptance criteria:

- You can log in, select a tenant, and see tenant-scoped resources

### Phase 3 — Project/session management UX
- Projects list + create project (repo URL, metadata)
- Sessions history (per project)
- Run history and run replay

Acceptance criteria:

- You can browse past sessions and re-open a past run transcript

### Phase 4 — Streaming run experience (enterprise UX)
- Message transcript view
- Tool calls panel
- File changes/diff viewer
- Search and filtering

Acceptance criteria:

- A run feels like an IDE-integrated agent: clear tool boundaries and actionable diffs

### Phase 5 — SaaS operational UX
- Billing placeholders (Stripe)
- Admin console placeholder
- Audit log views
- Workspace retention policies UI

## Implementation notes

- Keep API calls routed through Next.js `/api/*` routes so the browser never needs to know internal service names.
- Prefer small, composable components under `src/components`.
- Avoid prematurely adding complex state management until the core pages and navigation stabilize.
- Local development note: the IDE will show `Cannot find module` / missing type errors for Next/React/Node until you install Node dependencies in `frontend/` and `runner/`.

## Progress log

### 2026-01-15

- Added TailwindCSS + PostCSS configuration and global styles.
- Implemented a Phase 1 SaaS-style app shell (sidebar + top nav) and placeholder pages.
- Moved the Codex workflow into `/codex` under the new app shell.
- Implemented Next.js API routes under `/api/*` to proxy to the backend so the browser does not need to call internal service URLs.
- Wired the Codex page UI to the backend session/run/event endpoints via `/api/sessions`, `/api/sessions/[sessionId]/prompt`, and `/api/runs/[runId]/events`.
- Implemented `/` -> `/dashboard` redirect via `next.config.mjs` redirects.
- Added basic sidebar active-route highlighting (client-side) without relying on `next/navigation`.
- Resolved a Next.js route-group conflict by ensuring only one page resolves to each path (for example `/codex` lives under the `(app)` route group).
- Added `docs/Dev_Environment.md` to pin Node.js 20 LTS and document Windows/AWS Ubuntu 24.04 setup.
- Installed Node.js locally on Windows and installed `runner/` + `frontend/` npm dependencies (using `npm.cmd` to bypass PowerShell `npm.ps1` execution policy restrictions).

# Dev Environment (Pinned Versions)

This project is a monorepo with:

- `frontend/` (Next.js)
- `runner/` (Node + `@openai/codex-sdk`)
- `backend/` (Python)

## Pinned toolchain versions

- **Node.js**: **20 LTS** (minimum supported: Node 18+; recommended: Node 20 LTS)
- **npm**: included with Node
- **Python**: 3.12 (Docker uses `python:3.12-slim`)
- **Docker**: Docker Desktop (Windows) / Docker Engine (Linux)

Rationale:

- `@openai/codex-sdk` requires **Node 18+**.
- Next.js 14 is happiest on modern LTS (Node 18+).

## Windows (dev machine) setup

### Install Node.js 20 LTS

Preferred (winget):

```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

Alternative: download the Node.js LTS MSI from https://nodejs.org (LTS release).

### Verify

```powershell
node -v
```

Note: on some corporate Windows images, PowerShell blocks `npm` because it resolves to `npm.ps1` and script execution is disabled. In that case use `npm.cmd` (or call it by full path).

```powershell
npm.cmd -v
& "C:\Program Files\nodejs\npm.cmd" -v
```

### Install repo dependencies

Runner:

```powershell
npm.cmd install
```

Run this in `saas-codex/runner`.

Frontend:

```powershell
npm.cmd install
```

Run this in `saas-codex/frontend`.

## Ubuntu 24.04 (AWS) setup

### Option A (recommended): NodeSource (system-wide Node 20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

### Option B: nvm (per-user)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
node -v
npm -v
```

## Notes on IDE “Cannot find module/type declarations” errors

If you open the repo before installing Node dependencies, TypeScript/IDE will report errors like:

- `Cannot find module 'react'`
- `Cannot find module 'next/link'`
- `Cannot find type definition file for 'node'`

Installing dependencies in `frontend/` and `runner/` resolves these.

# BaseRate Windows Runbook

> **Target Platform:** Windows 10/11 (native PowerShell or Windows Terminal)  
> **Prerequisites:** Node.js 20+ (LTS) & npm  
> **Environment Note:** No WSL needed. No bash required. All scripts and paths are Windows-safe.

---

## 1. Prerequisites Check

Open PowerShell and verify that Node.js 20 or higher is installed:

```powershell
node -v
# Expected: v20.x.x or higher

npm -v
# Expected: 10.x.x or higher
```

If Node.js is not yet installed or is below version 20, install the latest LTS release from [nodejs.org](https://nodejs.org/).

---

## 2. Setup & Installation

Clone or navigate to the repository, and enter the `web` workspace directory:

```powershell
Set-Location -Path web
npm install
```

---

## 3. Canonical Developer Commands

All BaseRate npm scripts use cross-platform Node/npm commands compatible with PowerShell.

### Run Verification Check
Checks that required font binaries, App Router routes, and shell components are present:

```powershell
npm run demo:verify
```

### Type Checking
Runs TypeScript validation in strict mode without emitting files:

```powershell
npm run typecheck
```

### Linting Check
Validates linting configuration:

```powershell
npm run lint
```

### Production Build
Generates the production Next.js build:

```powershell
npm run build
```

### Start Development Server
Starts the Next.js local development server with Turbopack / App Router:

```powershell
npm run dev
```

Once running, access the application in your browser at:
- Landing: `http://localhost:3000/`
- Overview: `http://localhost:3000/overview`
- Dossier: `http://localhost:3000/dossier`
- Scorecard: `http://localhost:3000/scorecard`

---

## 4. Windows Safety Guidelines

- **Path Safety:** All imports and CSS asset URLs use forward slashes (`/fonts/...`). Do not hardcode backslashes or POSIX root paths (`/tmp`, `/home`).
- **No Bash / Heredocs:** Runbook instructions use standard PowerShell commands without bash syntax or heredocs.
- **Environment Variables:** If configuring local overrides, create `.env.local` inside the `web` folder.
- **Line Endings:** Git repository is configured for LF line endings.

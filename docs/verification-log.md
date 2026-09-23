# Deployment record: BaseRate on Vercel

**Date:** 2026-09-23
**Deployed by:** Hermes via Vercel REST API (token: local secret file `~/.vercel_token_env`, never committed)
**Account:** jayanng (Hobby plan)
**Project:** `baserate` (id `prj_JbYX7cfgUKotPNr7i7Q8h`), linked to GitHub `Jayanng/baserate`, production branch `main`, root directory `web`

## URLs

- **Stable production alias (use in submission):** https://baserate-ten.vercel.app
- Per-deploy alias: https://baserate-jayanngs-projects.vercel.app
- Git-branch alias: https://baserate-git-main-jayanngs-projects.vercel.app
- Production deployment at record time: `dpl_2PaVoH3wwZxHevC7po` (commit `c69b287`)

## Environment variables

- `GMI_API_KEY` (encrypted, target: production + preview) — powers the narration desk summary. The app is fully functional without it (graceful `narration_disabled`).

## Build history

1. **Deploy 1 failed:** `npm install` ENOTFOUND `mirrors.tencentyun.com`. Root cause: this VPS's npm is configured with a Tencent registry mirror, and `package-lock.json` recorded `http://mirrors.tencentyun.com/npm/...` `resolved` URLs. Vercel's build runners cannot reach that internal mirror.
2. **Fix (commit `c69b287`):** rewrote all `resolved` URLs in `web/package-lock.json` to `https://registry.npmjs.org/`. No dependency versions changed.
3. **Deploy 2:** READY in ~30s build time.

## Post-deploy verification (all run against the stable alias)

- `GET /` → 200, landing headline and "1,227" dataset references render, FAQ section present
- `GET /overview` → 200
- `GET /dossier` → 200
- `GET /scorecard` → 200
- `POST /api/narrate` with a computed dossier: 3/6 full narrations, 2/6 `number_guard_triggered` (guard working as designed), 1/6 `llm_unavailable` (upstream GMI variance). Degrades cleanly; page unaffected.

## Ongoing deploys

The project is git-linked: every push to `main` triggers a production deploy automatically. No manual redeploy needed.

## Known notes

- The `why-is-node-running` package in the lockfile came from the mirror's metadata; it is a devDependency of Next.js's build tooling, resolved from npmjs after the fix.
- If a future local `npm install` rewrites the lockfile with mirror URLs, re-run: `sed -i 's|http://mirrors.tencentyun.com/npm/|https://registry.npmjs.org/|g' web/package-lock.json` before pushing.

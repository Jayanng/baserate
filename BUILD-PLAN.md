# BaseRate Build Plan

> **Status:** Execution plan, not implementation.
>
> **Owner model:** Hermes supervises and verifies. Antigravity CLI with Gemini 3.8 Flash (High) codes all scoped tasks. Johnson approves screenshots, scope changes, commits, pushes, deployment, and submission. Hermes independently verifies every output before it reaches Johnson; the model choice does not change the verification bar.
>
> **Goal:** Build a judge-ready, login-free, read-only BaseRate demo for Bitget AI Base Camp Season 2, Track 3: AI Trading Desk, Sub-theme: Decision Stress Testing.

## 0. Locked product contract

### Product

BaseRate is a structured pre-trade stress-testing workbench for Bitget rToken weekend positions. The user enters one plain-English trade description. BaseRate parses it, computes deterministic Bitget-native risk, retrieves comparable historical episodes, shows an outcome distribution, provides live counterfactual controls, and registers the result as a forecast for later grading.

### Target user

A Bitget rToken holder considering a leveraged position from Friday US cash-market close to Monday cash-market reopen.

### Four pages maximum

1. `/` Landing: problem, product explanation, sample dossier, three-step workflow, CTA.
2. `/overview` Overview: current weekend exposure, frozen collateral state, weekend timeline, warnings, forecast-record summary.
3. `/dossier` Dossier: one natural-language trade input, parsed trade chips, deterministic risk cards, base-rate distribution, counterfactual controls, evidence table.
4. `/scorecard` Scorecard: calibration, regime accuracy, band adjustments, forecast ledger, replay disclosure.

No separate chat page, settings page, weekend-map page, or ledger page. The Dossier has a natural-language intake field, not a persistent ChatGPT-style conversation.

### Non-negotiable safety boundary

BaseRate is read-only research software.

- No Bitget account connection is required for the public demo.
- No API secrets are required for public market data.
- No order placement, cancellation, transfers, withdrawals, or execution.
- No BUY, SELL, LONG, SHORT, entry, or confidence signal output in user-facing conclusions. The input may describe a position direction for calculation, but the result must remain a stress dossier, not a recommendation.
- The deterministic engine computes every number.
- The language model, if used for prose, receives a sanitized computed dossier only. It cannot calculate or change values.
- Missing data produces `UNAVAILABLE` with a reason.
- Thin evidence produces `INSUFFICIENT_EVIDENCE`.
- Historical replay is labelled `REPLAY`, never presented as live grading.
- Every number carries evidence status: `observed`, `estimated`, `target`, or `replay`.

## 1. Verified facts and evidence sources

These facts are recorded in the repository and must not be silently changed:

| Fact | Evidence | Build consequence |
|---|---|---|
| Bitget spot rToken ticker works without authentication | `docs/data-probes.md` | Public live tape can be used without user keys |
| Spot candles use plain enum `1day` | `docs/data-probes.md` | Do not use futures UTC enums on spot endpoints |
| Spot candles paginate with `endTime` | `docs/data-probes.md` | Fetch history pages only when needed |
| Stock perps use plain tickers such as `NVDAUSDT`, not `RNVDAUSDT` | `docs/data-probes.md` | Map rNVDA display symbol to NVDAUSDT funding proxy explicitly |
| Current and historical funding endpoints work for stock perps | `docs/data-probes.md` | Funding carry can use verified Bitget data |
| Futures candles use UTC-style enum `1Dutc` | `docs/data-probes.md` | Keep spot and mix enum families separate |
| rToken spot history is young and listing-bound | `docs/data-probes.md` | Use native-market history for deep regimes, Bitget for live layer |
| Yahoo chart API provides deep daily history without a key | `docs/data-probes.md` | NVDA/AAPL/QQQ history powers base-rate episodes |
| Yahoo observed depths include NVDA from 1999, AAPL from 1980, QQQ from 1999 | `docs/data-probes.md` | These are source observations, not fabricated demo metrics |
| Jev is removed from the product | `docs/decision-no-jev.md` | No Jev key, quota, proxy, or external decision model in the judge path |
| Approved visual direction exists in static samples | `design/home_v3_small.png`, `design/overview_v2_small.png`, `design/dossier_v3_small.png`, `design/scorecard_v1_small.png` | Production UI must use the same tokens and family, with original page compositions |

### Evidence status rule

A verified endpoint response is not automatically a verified product calculation. Every adapter must preserve source timestamp, request identity without secrets, response status, and normalization notes. A calculation is shown only when its inputs pass validation.

### Official handbook verification

**Source:** https://bitget-ai.gitbook.io/bitgetai_hackathons2
**Retrieved:** 2026-09-23 via the official GitBook page
**Event:** Base Camp Hackathon S2
**Event period:** September 3–27, 2026; submission deadline September 27, 2026, UTC+8

The handbook explicitly defines Track 3 as **AI Trading Desk (AI Research Workbench)**:

> A natural-language-driven AI research workbench. AI processes information, invokes tools, and presents analysis; human traders make final decisions.

The selected named sub-theme is **Decision Stress Testing**:

> Before opening a position, how does AI retrieve historically similar scenarios?

The handbook's example approach is:

> Input trade idea → retrieve historical distribution; preset stress tests.

### Exact Track 3 requirements

BaseRate must provide:

1. **Accessible Demo** — required.
2. **One complete research task** — required. The demo must show the full flow from question to actionable insight.
3. **Compliant X promotional post** — required. The submission must include at least one X post link that:
   - includes `#BitgetHackathon`
   - includes `@Bitget_AI`
   - interactively introduces the product being built
   - quotes/retweets the Bitget AI announcement URL specified by the handbook: `https://x.com/Bitget_AI/status/2100519318824055159?s=20`
4. **Project Description** — required in the Google Form. GitHub or X links cannot replace this written answer.
5. **Role of the LLM** — required as a separate form field, including which models were used and what they actually did. If no Qwen credits were used, the Qwen subsection is skipped.
6. **Track and sub-theme selection** — required: Track 3 → Decision Stress Testing.

### Six required Project Description parts

The submission answer must cover these six parts, with the first three carrying the most weight:

1. **Thesis:** why BaseRate was built and its core hypothesis.
2. **Target user and product value:** a concrete segment, not "all traders." BaseRate's segment is Bitget rToken holders considering leveraged Friday-to-Monday positions.
3. **Validation data and key metrics:** label figures as observed, estimated, or targeted. For BaseRate this includes data-source depth, comparable-episode sample size, replay records, task completion/demo validation, and the plan for usage validation. Do not invent users, usage, or performance.
4. **Progress:** what is built, what is not built, problems found, fixes, frameworks, models, and APIs used.
5. **Deliverables:** exact demo, repository, screenshots/video, fixtures, and documentation links in the materials field.
6. **Your take on AI Trading:** optional; explain how AI assists research while the human retains the final decision.

### Track 3 judging focus

The handbook lists subjective judge scoring focused on:

- Feature depth: data sources, Skills/integration count and effectiveness
- Research quality
- LUI fluency
- Personalized thesis

BaseRate's build must therefore make the complete research task obvious within the first minute: a trade idea enters, Bitget/native evidence is assembled, historical distribution and stress outputs appear, a counterfactual changes the result, and the human receives an actionable risk insight without an automated trade instruction.

### General handbook constraints relevant to BaseRate

- The form requires a complete project description plus an accessible submission-materials link.
- A GitHub repository or X long-form post cannot substitute for the Project Description.
- Missing the compliant X post, written Project Description, or accessible materials makes the submission invalid.
- S2 rejects direct S1 reuse or only minor renames/edits. BaseRate must document its substantive new work and not present an earlier project as the entry.
- A team may submit to at most two themes, each as an independent project and separate form submission. BaseRate is one independent entry.
- The official handbook describes `bitget-mcp-server` as read-only US stock/ETF data and says it requires no Bitget account or API key. It is optional for BaseRate, not a critical-path dependency.

### Date inconsistency to verify before submission

The page contains inconsistent public-voting date text in different sections: one section states September 22–28, while another states September 28–October 7. The handbook also states judge review runs September 22–October 7 in one section, while the timeline lists other date ranges. This does not affect the build, but the final submission checklist must re-check the current official form and announcement before stating voting or judging dates.

## 2. Architecture decision

### Recommended stack

Use a single Next.js App Router application with TypeScript for the production build.

- Next.js + React + TypeScript
- CSS Modules or a single token-driven stylesheet, not a utility-class palette that drifts from the approved samples
- Local WOFF2 fonts in `public/fonts/`
- TypeScript deterministic engine in `src/domain/` and `src/data/`
- JSON replay fixtures committed under `fixtures/`
- Server-side API routes for public data fetches and normalization
- Browser UI consumes typed domain objects, never raw vendor responses
- No Python runtime required for the production demo, which simplifies Windows setup
- Optional Python scripts may be used for offline data preparation only if they have a Windows-safe replacement or are not required for judges

### Why this is Windows-compatible

The canonical developer commands use Node/npm and work in PowerShell:

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Rules:

- Use `path.join`, `path.resolve`, and URL APIs. Never hard-code `/tmp`, `/home/ubuntu`, or POSIX-only paths in app code.
- Never use bash heredocs in user-facing Windows instructions.
- Use `.env.local.example`, not shell-specific exports.
- Use `cross-env` only if an environment variable is needed in npm scripts.
- Use `npm run` scripts instead of Makefiles.
- Use UTF-8 JSON and LF-safe tooling, but do not assume executable shell permissions.
- Avoid symlink-dependent assets.
- Use `fetch`, not curl, inside application code.
- Use Vitest or Jest with tests that run on Linux and Windows.
- Use a Node script for fixture generation, so the same command runs on both systems.
- The app must work with `npm run dev` on Windows without WSL.

## 3. Repository target structure

```text
baserate/
  app/
    page.tsx
    overview/page.tsx
    dossier/page.tsx
    scorecard/page.tsx
    api/market/route.ts
    api/dossier/route.ts
    globals.css
    layout.tsx
  components/
    shell/TopNav.tsx
    shell/AppFrame.tsx
    landing/Hero.tsx
    landing/SampleDossier.tsx
    overview/ExposureCard.tsx
    overview/WeekendStrip.tsx
    overview/ActionCard.tsx
    overview/ForecastRecord.tsx
    dossier/TradeIntake.tsx
    dossier/ParsedTrade.tsx
    dossier/RiskMetrics.tsx
    dossier/BaseRateDistribution.tsx
    dossier/CounterfactualControls.tsx
    dossier/EvidenceTable.tsx
    scorecard/CalibrationHero.tsx
    scorecard/RegimeTable.tsx
    scorecard/AdjustmentLog.tsx
    scorecard/ForecastLedger.tsx
    scorecard/ReplayDisclosure.tsx
    ui/Pill.tsx
    ui/Card.tsx
    ui/LineIcon.tsx
  src/
    domain/types.ts
    domain/validation.ts
    domain/trade-parser.ts
    domain/regime-classifier.ts
    domain/risk-engine.ts
    domain/base-rate.ts
    domain/scorekeeper.ts
    domain/provenance.ts
    data/bitget-client.ts
    data/yahoo-client.ts
    data/normalizers.ts
    data/cache.ts
  fixtures/
    golden-dossier.json
    replay/weekends.json
  scripts/
    generate-replay-fixtures.ts
    verify-fixtures.ts
  tests/
    domain/trade-parser.test.ts
    domain/regime-classifier.test.ts
    domain/risk-engine.test.ts
    domain/base-rate.test.ts
    domain/scorekeeper.test.ts
    data/normalizers.test.ts
    api/routes.test.ts
  public/
    fonts/PlusJakartaSans.woff2
    fonts/Inter.woff2
  docs/
    data-probes.md
    decision-no-jev.md
    architecture.md
    provenance.md
    windows-runbook.md
    verification-log.md
  BUILD-PLAN.md
  README.md
  .env.local.example
  .gitignore
  package.json
  tsconfig.json
  next.config.ts
```

Do not create all files at once. Each phase owns its files and has a gate.

## 4. Phase gates

No phase is complete because an agent says it is complete. A phase is complete only when:

1. The expected files exist on disk.
2. The implementation matches this plan.
3. Unit tests pass.
4. Relevant integration checks pass.
5. The app builds.
6. UI phases have a rendered screenshot inspected by Hermes and approved by Johnson.
7. No secrets are tracked.
8. The phase report records changed files, commands, outputs, known limitations, and next phase.

Every Antigravity task must end with this fixed report:

```text
PHASE REPORT
Status: PASS | BLOCKED | PARTIAL
Files created:
Files modified:
Commands run:
Tests and exact results:
Screenshots:
Known limitations:
Unverified claims:
Suggested next step:
```

Antigravity must not claim live data, deployment, tests, or screenshots unless it actually performed the action and reports the output.

## 5. Phase 0: Project safety and design tokens

**Owner:** Antigravity codes, Hermes verifies. **Human gate:** Johnson approves token screenshot.

### Objectives

- Preserve approved visual direction.
- Turn the approved static samples into one reusable token system.
- Remove sample-only hardcoded values from production components.

### Tasks

1. Read the four approved samples and extract the common design DNA, not their layouts.
2. Create `app/globals.css` or `src/styles/tokens.css` with named tokens:
   - canvas and shell colors
   - paper and card surfaces
   - ink, muted, faint text
   - indigo/violet primary
   - lime, lavender, peach, coral semantic accents
   - 36px shell radius, 24px card radius, 16px inner radius, pill radius
   - layered shadows
   - 4px/8px spacing scale
   - typography scale and weights
3. Copy local fonts into `public/fonts/`.
4. Create `docs/design-system.md` describing token roles and forbidden drift.
5. Ensure all future components use tokens, not unexplained raw colors.

### Acceptance tests

- CSS parses.
- Fonts load from local paths.
- A token preview route or temporary page renders the palette, type scale, cards, pills, and icons.
- Screenshot visually matches the approved family, not a copied reference layout.
- No dark hacker UI, generic blue crypto terminal, sidebar layout, or chat UI.

## 6. Phase 1: Windows-safe application shell

**Owner:** Antigravity. **Hermes gate:** inspect structure, run build on Linux. **Johnson gate:** screenshot approval.

### Tasks

1. Initialize Next.js App Router with TypeScript and npm scripts.
2. Add lint, typecheck, test, dev, build, and screenshot scripts.
3. Create shared `AppFrame` and `TopNav`.
4. Create four routes exactly: `/`, `/overview`, `/dossier`, `/scorecard`.
5. Active top-nav state must match the current route.
6. Load local Plus Jakarta Sans and Inter.
7. Add responsive behavior for at least 1440px, 1024px, 768px, 414px, 375px, and 320px.
8. Add `.env.local.example` with only non-secret variable names.
9. Add `docs/windows-runbook.md` with PowerShell commands.

### Acceptance tests

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

All must pass on Linux. Johnson must run the same commands on Windows and paste raw output. Do not call Windows compatibility complete before the local run passes.

## 7. Phase 2: Domain contracts before UI data

**Owner:** Antigravity. **Hermes gate:** inspect types and tests.

### Core types

Create typed contracts for:

- `TradeIntent`
- `ParsedTrade`
- `MarketSnapshot`
- `FrozenCollateralState`
- `FundingObservation`
- `WeekendGapObservation`
- `RegimeTag`
- `OutcomeDistribution`
- `EvidenceItem`
- `Dossier`
- `ForecastRecord`
- `CalibrationRecord`
- `DataHealth`
- `RefusalState`

Every numeric field must include evidence status and provenance where appropriate. Avoid `any`. Unknown values must be nullable or represented by a refusal state, never silently zero.

### Acceptance tests

- TypeScript strict mode passes.
- Invalid trade input is rejected with a typed reason.
- Missing source data produces `UNAVAILABLE`.
- Thin sample produces `INSUFFICIENT_EVIDENCE`.
- A fixture can be parsed into a valid golden dossier.

## 8. Phase 3: Verified data adapters

**Owner:** Antigravity. **Hermes gate:** run live public probes and inspect normalized output.

### Bitget adapter

Implement only public, read-only endpoints:

- Spot ticker for the rToken symbol.
- Spot order book for depth.
- Spot candles using `granularity=1day`.
- Mix current funding rate using the plain stock-perp symbol, e.g. `NVDAUSDT`.
- Mix funding history using `fundingTime` and `fundingRate`.
- Mix candles using `granularity=1Dutc`.
- Contracts and symbol mapping only where needed.

Never assume `RNVDAUSDT` is a futures symbol. Maintain an explicit mapping:

```text
rNVDA display asset -> RNVDAUSDT spot tape -> NVDAUSDT stock-perp funding proxy
```

The UI must label the funding proxy relationship clearly.

### Yahoo adapter

Implement keyless native-market history fetch with:

- Symbol allowlist.
- Period bounds.
- Interval validation.
- Retry with bounded timeout.
- Response shape validation.
- Rate-limit handling.
- No fabricated fallback rows.

### Normalization

Normalize vendor responses at the boundary into domain types. Preserve:

- source
- endpoint family
- symbol
- timestamp
- response status
- observed versus estimated status
- reason for any proxy or limitation

### Acceptance tests

- Public Bitget adapter smoke test returns a valid response or a structured `UNAVAILABLE` result.
- Yahoo adapter smoke test returns validated daily rows or a structured failure.
- No secret-bearing environment variable is read by public adapters.
- Vendor payloads are never sent directly to UI components.

## 9. Phase 4: Deterministic engine

**Owner:** Antigravity. **Hermes gate:** independent review and tests.

### Trade parser

Parse a plain-English input into a `ParsedTrade`. The golden path must support:

```text
I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.
```

The parser must surface uncertainty instead of guessing. Unsupported or ambiguous input becomes a clarification state, not a fabricated trade.

### Regime classifier

Use a published deterministic classifier. It may use fixed feature windows such as:

- directional return
- realized volatility
- drawdown
- trend persistence
- volume or liquidity proxy where available

The exact thresholds must live in one config module and be documented. Same inputs must always produce the same tag. This is an in-house deterministic classifier, not Jev.

### Risk engine

Implement and test:

- frozen Friday collateral rule as a rule-based field, not an observed rToken ticker field
- collateral ratio inputs as explicit configuration
- liquidation-distance calculation with validated positive inputs
- funding carry over the holding window
- weekend order-book depth and slippage stress
- Friday-to-Monday gap distribution
- survival/breach classification

Do not claim an observed rToken index or mark if the public ticker does not expose one. Label rule-based values clearly.

### Base-rate engine

For the current regime:

- select valid comparable episodes
- expose sample size
- calculate category counts and percentages
- calculate median and tail outcomes
- calculate liquidation-boundary breach frequency
- preserve episode dates and source provenance
- refuse if evidence is below the minimum sample threshold

### Acceptance tests

- Unit tests cover positive, negative, zero, missing, and extreme inputs.
- No calculation defaults missing values to zero.
- Same fixture produces byte-equivalent normalized dossier output.
- Golden dossier passes all domain validation.
- Test suite proves no LLM call is needed to compute a number.

## 10. Phase 5: Scorekeeper and replay system

**Owner:** Antigravity. **Hermes gate:** inspect ledger semantics and replay output.

### Forecast registry

Implement append-only forecast records with:

- stable forecast ID
- issue timestamp
- input trade hash
- issued outcome bands
- regime tag
- data snapshot ID
- evidence status
- record hash linked to previous record

No update operation may mutate an issued record.

### Grading

After the relevant market window:

- compare actual result with issued band
- grade hit/miss/pending
- grade funding estimate separately
- record the actual data provenance
- preserve misses permanently

### Calibration

Calculate:

- overall hit rate
- per-regime hit rate
- sample counts
- provisional state for small samples
- band adjustment reason

Do not call a two-record regime reliable. Do not show 2/2 as statistically strong.

### Replay

Generate 30 historical replay records using only data available before each historical window. Label every replay record `REPLAY`. The UI must disclose that replay demonstrates the mechanism and is not live grading.

### Acceptance tests

- Append-only mutation test.
- Replay leakage test: no post-window data enters a replay input.
- Score math test: counts and percentages agree.
- Capitulation 2/2 displays 100% observed accuracy but provisional confidence.
- No duplicate or contradictory calibration figures.

## 11. Phase 6: Dossier page

**Owner:** Antigravity. **Hermes gate:** engine integration, screenshot review. **Johnson gate:** visual approval.

### Required UI

- Top nav with Dossier active.
- Structured natural-language intake field, no persistent chat interface.
- Parsed chips: asset, direction, leverage, margin, holding window, read-only.
- Subtle parsed confirmation, not a generic full-width alert.
- Bitget-native risk metrics with observed/estimated labels.
- Historical base-rate distribution.
- Custom counterfactual sliders with visible filled track, thumb, bounds, and current value.
- Evidence table with real column alignment.
- Refusal and unavailable states visible in the UI.
- Provenance drawer or expandable evidence detail.

### Acceptance tests

- Golden input renders a complete dossier.
- Changing size recomputes output from engine state, not DOM arithmetic.
- Changing leverage recomputes output.
- Invalid or insufficient data does not render plausible fake numbers.
- Screenshot matches the approved visual family.

## 12. Phase 7: Overview page

**Owner:** Antigravity. **Hermes gate:** screenshot and content review. **Johnson gate:** visual approval.

### Required UI

Use an original composition, not the reference image's layout:

- Top navigation bar, no sidebar.
- Active weekend exposure hero.
- Compact Friday-to-Monday weekend strip, not a generic full calendar.
- Frozen collateral state and current status.
- Action cards with restrained semantic treatments, not excessive pills.
- Forecast record summary with mathematically consistent numbers.
- Activity feed with current dossier events.

### Acceptance tests

- No full-month calendar unless it adds real product value.
- No pill overload.
- No arbitrary red alarm treatment; use the locked semantic palette.
- Overview links to Dossier and Scorecard.
- Responsive layout passes all target widths.

## 13. Phase 8: Scorecard page

**Owner:** Antigravity. **Hermes gate:** score math and screenshot review. **Johnson gate:** visual approval.

### Required UI

- Top navigation bar, Scorecard active.
- One replay-mode indicator, not duplicate warnings.
- Calibration hero with mathematically consistent counts and percentages.
- Per-regime table with aligned columns.
- Accuracy bars reflect actual values, including 100% observed with provisional styling for 2/2.
- Separate semantic columns for record, confidence/maturity, and action.
- Band-adjustment log with reasons.
- Forecast ledger with scalable table/grid treatment and visible hashes.
- Replay disclosure with exact limitations.

### Acceptance tests

- All displayed counts and percentages are generated from one data object.
- Ledger hashes are stable and verifiable.
- Replay and live records are visually distinct.
- Small sample warnings are honest.

## 14. Phase 9: Landing page

**Owner:** Antigravity. **Hermes gate:** screenshot and copy review. **Johnson gate:** visual approval.

### Required UI

- Original landing-page composition using approved visual DNA.
- Hero statement: BaseRate's weekend stress problem.
- Sample dossier visual with believable but explicitly demo-labelled data.
- Three steps: stress the trade, find the base rate, keep the score.
- No invented customer logos, testimonials, adoption metrics, or performance claims.
- CTA leads to `/overview` or `/dossier`.
- Product remains clearly read-only and human-decided.

### Acceptance tests

- Landing does not copy the reference layout.
- No unsupported claims.
- CTA route works.
- Screenshot approved at desktop and mobile widths.

## 15. Phase 10: Fixture-first judge demo

**Owner:** Antigravity. **Hermes gate:** run complete path without external dependencies.

### Golden path

The judge can:

1. Open the login-free landing page.
2. Enter or use the golden rNVDA weekend trade.
3. See parsed trade details.
4. See deterministic risk metrics.
5. See historical distribution and evidence.
6. Move position size and see a changed risk boundary.
7. Open Scorecard.
8. See replay records, hits, misses, and adjustments.

### Reliability rules

- Default demo path uses committed sanitized fixtures.
- Live public data is an optional refresh, not a single point of failure.
- No judge interaction consumes an external quota.
- No credentials are required.
- Fixture values are sourced, labelled, and documented.
- The demo displays a visible `DEMO/REPLAY` status where appropriate.

### Acceptance tests

- `npm run demo:verify` works offline after `npm install`.
- Deleting network access does not break the golden demo.
- A clean clone can restore fixtures using one Windows-safe npm command.
- No secrets appear in tracked files, build output, screenshots, or logs.

## 16. Phase 11: Cross-platform verification

**Owner:** Hermes on Linux + Johnson on Windows.

### Linux gates

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run demo:verify
```

### Windows gates

Run the same commands in PowerShell from the repository root. Johnson records raw output. If Windows fails:

1. Do not patch only the new test.
2. Record the exact command, error, Node/npm versions, and OS.
3. Hermes reproduces or fixes in the canonical repo.
4. Antigravity receives a scoped correction.
5. Re-run the full suite, not only the failed test.

### Cross-platform requirements

- No POSIX-only path assumptions.
- No bash heredoc in runbooks.
- No shell-specific build step.
- No case-sensitive import that only fails on Windows.
- No delete-while-open file behavior in fixture scripts.
- No reliance on symlinks.
- No committed local absolute paths.

## 17. Phase 12: Full verification and compliance freeze

### Product verification

- Four routes work.
- Dossier engine output matches fixture expectations.
- Counterfactuals change output.
- Scorekeeper preserves records and grades replay.
- Refusal states work.
- Unavailable states work.
- All numbers have provenance.
- No LLM computes numbers.
- No account keys are required.
- No execution exists in code or UI.

### Public-surface audit

Search judge-facing files for:

- competitor names or handles
- comparisons to other projects
- internal strategy
- unsupported uniqueness claims
- Jev references, because it was removed from the product
- stale dates, counts, endpoints, or test totals
- fake testimonials, logos, users, or performance claims
- secrets, tokens, `.env` contents, absolute machine paths

The README must describe BaseRate on its own terms and must not compare it to other hackathon projects.

### Official handbook/form verification

Before submission, retrieve and inspect the current official Bitget handbook/form directly. Verify:

- track name
- sub-theme name
- required deliverables
- demo URL requirements
- repository visibility/access requirements
- video requirements
- deadline and timezone
- allowed technologies and data sources
- any required Bitget integration evidence

Update `docs/handbook-compliance.md` with URL, retrieval date, exact requirement, implementation evidence, and status. If a requirement cannot be verified, mark it `UNVERIFIED` and do not claim compliance.

## 18. Phase 13: Deployment and submission package

### Deployment

- Deploy login-free demo to a verified host.
- Confirm all four routes directly.
- Confirm refresh/deep links work.
- Confirm no secrets are exposed in client bundles.
- Confirm the demo works with network sources unavailable using fixtures.
- Record URL and deployment timestamp in `docs/verification-log.md`.

### Demo recording

Use a 60-second cold path:

1. Landing thesis.
2. Open Dossier.
3. Enter golden trade.
4. Show Bitget-native risk and historical distribution.
5. Move size control.
6. Show changed liquidation boundary.
7. Open Scorecard.
8. Show replay hits, miss, and adjustment.
9. Close on: “Every stress report is a claim about the future. BaseRate is the desk that shows its score on Monday.”

### Submission

Draft form answers from the README and verified evidence. Johnson performs the final irreversible submit action.

## 19. Antigravity task protocol

Every dispatch must be scoped to one phase or one bounded task. The prompt must include:

1. Read `BUILD-PLAN.md` first.
2. State the phase and task ID.
3. Read only the referenced files and docs.
4. Do not change product scope, page count, visual direction, or safety boundary.
5. Do not add Jev, chat, account auth, order execution, or extra pages.
6. Do not invent data or report unverified facts as verified.
7. Use Windows-safe Node/npm commands.
8. Write tests before implementation for domain logic.
9. Run the phase's exact acceptance commands.
10. Return the fixed `PHASE REPORT` block.

Antigravity must stop and report `BLOCKED` when:

- a required endpoint shape differs from this plan
- a source returns empty or ambiguous data
- a calculation needs an undocumented assumption
- a dependency requires credentials
- a UI requirement conflicts with the approved design direction
- a test or build fails
- a task would touch files outside its scope

## 20. Change control

Any change to one of these requires Johnson's explicit approval before coding:

- page count
- product identity or target user
- no-Jev decision
- no-chat decision
- read-only boundary
- data-source decision
- visual design direction
- framework choice
- submission track or sub-theme

## 21. Final definition of done

BaseRate is ready only when:

- The four-page app is deployed and login-free.
- The golden dossier path works from a clean clone.
- The engine uses deterministic calculations and validated source data.
- The Dossier visibly demonstrates stress testing and counterfactuals.
- The Scorecard visibly demonstrates forecast grading and replay.
- Overview and Landing explain the product clearly.
- Linux and Windows checks pass.
- Screenshots of all four pages are approved.
- The official handbook/form compliance matrix is verified.
- README and judge-facing docs contain no competitor references.
- No secrets, execution actions, or unsupported claims remain.
- Final commit and push are explicitly approved and verified.

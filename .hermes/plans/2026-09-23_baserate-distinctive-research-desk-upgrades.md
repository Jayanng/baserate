# BaseRate Distinctive Research Desk Upgrades Implementation Plan

> **For Hermes:** Execute through Antigravity only. Hermes is the supervisor, auditor, and reviewer. Do not hand-code implementation changes.

**Goal:** Make BaseRate a clearly differentiated, honest, fully verifiable Decision Stress Testing workbench whose live judge path visibly connects a natural-language trade idea to current evidence, historical comparables, deterministic stress math, counterfactual decisions, and replay accountability.

**Architecture:** Preserve BaseRate's single-wedge product: a read-only pre-trade weekend stress desk for leveraged rToken positions. Add a bounded live-evidence layer around the existing deterministic fixture/replay core rather than replacing the reproducible dataset with uncontrolled live state. Every displayed value must declare whether it is live observed, pinned replay, computed, estimated, or replay graded. The user-facing story must be BaseRate-only and product-led; no competitor names or comparison language may enter README, UI, landing, form copy, or judge-facing docs.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Vitest, Bitget public REST, Yahoo public chart data, committed replay fixtures, deterministic TypeScript engines, GMI DeepSeek-V4-Flash narration, Vercel.

---

## Non-negotiable boundaries

1. **All coding goes to Antigravity.** Hermes may inspect, test, probe, render, measure, review, and re-specify. Hermes must not directly edit implementation files.
2. **No orders, account connections, credentials, wallet actions, or autonomous execution.**
3. **No fabricated live state.** If a live source fails, show `UNAVAILABLE` or retain a clearly labelled pinned replay value. Never silently substitute.
4. **Do not turn the product into a portfolio manager, debate tool, news terminal, cron system, or execution assistant.**
5. **No competitor names or comparison claims in project files intended for judges.** Position only around BaseRate's own thesis.
6. **Do not claim new user forecasts are persisted and graded Monday until persistence and scheduling actually exist.**
7. **Do not call the LLM a calculator.** The deterministic engine owns every number. The LLM narrates a sanitized result only.
8. **No raw hex CSS values. Use existing `--br-*` tokens.**
9. **No commit or push without Johnson's explicit approval.**

## Product thesis to preserve

> BaseRate answers one narrow question deeply: for this exact leveraged rToken weekend trade, what happened across comparable historical weekends, what can frozen Friday collateral withstand, and how does the conclusion change when the trader reshapes the position?

The product is not a buy/sell signal. Its actionable output is a plain-English risk interpretation that leaves the decision with the human.

---

# Phase 0: Baseline and truth inventory

### Task 0.1: Capture the current baseline

**Objective:** Establish a reproducible pre-change baseline before any implementation work.

**Files:**
- Read only: `README.md`
- Read only: `BUILD-PLAN.md`
- Read only: `web/app/dossier/page.tsx`
- Read only: `web/components/dossier/*`
- Read only: `web/src/data/*`
- Read only: `web/src/engine/*`
- Read only: `web/app/api/narrate/route.ts`

**Commands:**

```bash
cd /home/ubuntu/baserate/web
npm test
npx tsc --noEmit
npm run build
npm run demo:verify
```

**Expected:** Current suite passes, current build passes, demo verification passes. Record exact counts in the phase handoff, not in source constants.

### Task 0.2: Build a claim inventory

**Objective:** Find every judge-facing statement that implies live persistence, live grading, current data, thin-book calculation, or universal uniqueness.

**Search:**

```bash
cd /home/ubuntu/baserate
rg -n -i "every monday|live grades|live tape|thin.book|slippage|no current tool|only|unique|remembers|learns|registered forecast|current values|live data" README.md BUILD-PLAN.md web/app web/components docs
```

**Deliverable:** A findings table with columns: claim, file, factual status, replacement wording, verification evidence.

### Task 0.3: Define display provenance types

**Objective:** Prevent future copy and UI confusion between live evidence and pinned replay data.

**Likely files:**
- Modify: `web/src/domain/types.ts`
- Test: `web/tests/domain/provenance-display.test.ts`

**Design:** Use the existing evidence labels where possible. If a new type is needed, keep it small and explicit:

```ts
type DisplayProvenance =
  | 'live_observed'
  | 'pinned_replay'
  | 'computed'
  | 'estimated'
  | 'replay_graded'
  | 'unavailable';
```

Do not add a database, localStorage persistence, or cron in this plan.

---

# Phase 1: Correct the public promise before adding surface area

### Task 1.1: Rewrite stale live-learning language

**Objective:** Make the current demo's replay status impossible to misunderstand while preserving the calibration thesis.

**Files:**
- Modify through Antigravity: `README.md`
- Modify through Antigravity: `web/components/landing/LandingPage.tsx`
- Modify through Antigravity: `web/app/overview/page.tsx`
- Modify through Antigravity: `web/app/scorecard/page.tsx`
- Modify through Antigravity: relevant FAQ/copy fixtures

**Required wording direction:**

- Say that the deployed demo demonstrates the forecast, grading, ledger, and calibration loop through deterministic replay.
- Say that the current public demo is read-only and does not claim live scheduled persistence for every new visitor session.
- Keep `Replay mode` visible wherever the replay scorecard is shown.
- Replace any broad claim equivalent to `No current tool answers that` with a product-specific thesis about BaseRate's exact combination of historical weekend distributions and frozen-collateral math.
- Do not mention another project, competitor, or market comparison.

**Acceptance:** A fresh reader cannot reasonably infer that a new visitor's custom trade is automatically stored and graded the following Monday.

### Task 1.2: Add a truthful product boundary block

**Objective:** State what BaseRate does and does not claim without weakening the product.

**Required public boundary:**

> The public demo uses pinned replay fixtures so every judge sees the same result. Live Bitget and Yahoo links expose current public evidence. The scorekeeper loop is demonstrated with replay forecasts; this demo does not claim autonomous persistence or live Monday scheduling for each visitor's custom session.

Place this in the most natural existing FAQ or trust section, not as a warning banner dominating the hero.

### Task 1.3: Test the claim boundary

**Test:** Add copy-level assertions only if the project already uses such tests. Otherwise use deterministic grep gates in `docs/verification-log.md` and the final audit.

**Required gates:**

```bash
rg -n "No current tool answers that|every new.*Monday|automatically.*Monday|live scheduled" README.md web/app web/components
```

Expected: no stale overclaiming language. Any remaining occurrence must be explicitly labelled as a future or replay limitation.

---

# Phase 2: Make historical comparability visible

### Task 2.1: Extract a matching explanation model

**Objective:** Explain in plain language why the displayed historical sample is relevant to the current trade.

**Likely files:**
- Create through Antigravity: `web/components/dossier/match-explanation.ts`
- Modify: `web/src/domain/types.ts` only if the existing domain type cannot represent it
- Test: `web/tests/domain/match-explanation.test.ts`

**Required inputs:**
- asset
- direction
- leverage
- holding window
- entry timing
- regime tag
- sample size
- history source/date range

**Required output:** A structured explanation such as:

```text
Matched on: rNVDA · Friday-close entry · weekend hold · trend-down regime
Sample: 1,227 observed Friday-to-Monday episodes
History: native NVDA daily closes, 1999–2026
```

The wording must distinguish total available episodes from the actual regime-matching policy. Do not claim a smaller matched sample unless the engine really uses one.

### Task 2.2: Add a visible "Why these weekends" disclosure

**Objective:** Stop a judge from assuming the product simply counted every weekend without a matching rationale.

**Files:**
- Modify: `web/components/dossier/DistributionChart.tsx` or the most appropriate distribution component
- Modify: `web/components/dossier/DossierPage.module.css`
- Test: component or string-level test as appropriate

**Behavior:** Add a native disclosure adjacent to the distribution's existing HOW disclosure. It must show the actual current asset, trade shape, regime, sample, date range, and source label. It must not expose implementation jargon without a plain-English explanation.

### Task 2.3: Verify cross-asset truth

**Required cases:**

| Asset | Expected history behavior |
|---|---|
| rNVDA | 1,227 episodes, native history back to 1999 |
| rTSLA | 736 episodes, history begins at TSLA availability |
| rAAPL | asset-specific history and worst date from fixture |
| rQQQ | asset-specific history and distribution |
| rMSTR | asset-specific history and materially different tail |

Run the engine directly and verify the UI displays the same asset and sample values. Add regression tests preventing the NVDA date/source text from appearing for non-NVDA dossiers.

---

# Phase 3: Make the live evidence layer real without sacrificing replay determinism

### Task 3.1: Define live-read scope

**Objective:** Decide exactly which values may be fetched live in the judge path and which remain pinned.

**Live candidates:**
- Bitget spot ticker
- Bitget funding rate
- Bitget public order book
- Yahoo chart endpoint for source verification

**Pinned replay values:**
- historical gaps
- regime-tagged episodes
- replay forecast records
- scorekeeper ledger

**Rule:** A live read may enrich the current dossier, but the replay distribution and Scorecard must remain deterministic. The UI must display a provenance chip on every live-enriched value.

### Task 3.2: Implement bounded live market snapshot loading

**Objective:** Use existing Bitget clients to fetch the current spot/funding/order-book snapshot with timeout and fail-closed behavior.

**Likely files:**
- Modify: `web/src/data/bitget-client.ts` only for missing timeout/normalization needs
- Modify: `web/src/data/normalizers.ts`
- Create or modify: `web/src/data/live-market-snapshot.ts`
- Modify: `web/app/dossier/page.tsx` or a server-side data boundary
- Tests: `web/tests/data/*`, `web/tests/engine/*`

**Constraints:**
- No API key.
- Public endpoints only.
- Bound every request with an explicit timeout.
- Never block the full dossier on a live endpoint.
- On timeout or invalid data, render `UNAVAILABLE` with a source status and retain pinned replay outputs where appropriate.
- Never label a fixture number as live.

### Task 3.3: Add a visible live versus replay evidence strip

**Objective:** Make the data mode obvious in the first minute.

**Required display:**

```text
Current market snapshot: LIVE OBSERVED · Bitget public REST · retrieved <timestamp>
Historical distribution: PINNED REPLAY · Yahoo native history · generated <date>
```

Use existing design tokens and compact card treatment. Do not add a large dashboard panel.

### Task 3.4: Verify live endpoints and degraded states

**Tests and probes:**

- Bitget spot 200 with valid rToken.
- Bitget funding 200 with valid perp.
- Order book valid response and normalized levels.
- Malformed response produces `UNAVAILABLE`.
- Timeout does not blank the dossier.
- Unsupported asset never triggers an uncontrolled vendor request.
- A static demo verification run remains offline-safe if the project promises offline demo mode. If live mode is required for a specific route, document that precisely.

---

# Phase 4: Make thin-book stress visible and honest

### Task 4.1: Audit the existing order-book implementation

**Objective:** Determine whether current order-book code produces a defensible slippage estimate or only top-of-book values.

**Files to inspect:**
- `web/src/data/bitget-client.ts`
- `web/src/data/normalizers.ts`
- `web/src/domain/types.ts`
- `web/src/engine/*`
- Existing tests

**Decision gate:** Do not call the feature slippage stress until the engine can walk levels and calculate a clearly defined estimate. If the current code only exposes bid/ask, rename visible copy to spread/market-depth observation rather than overstating slippage.

### Task 4.2: Add bounded depth stress calculation

**Objective:** Show how the proposed notional interacts with available public order-book depth, without claiming fill execution.

**Likely files:**
- Create: `web/src/engine/depth-stress.ts`
- Test: `web/tests/engine/depth-stress.test.ts`
- Modify: Dossier risk/provenance types

**Required outputs:**
- observed book timestamp
- side/direction
- requested notional
- covered notional, if any
- estimated VWAP or slippage range, if calculable
- `INSUFFICIENT_DEPTH` when levels do not cover the requested size
- explicit label: estimate, not an execution quote

**Never output:** a claim that an order would fill, a guaranteed price, or a trade recommendation.

### Task 4.3: Add a compact depth-stress card

**Objective:** Put the thin-book risk where a judge can see it without making the page a trading terminal.

**Required copy:**

> Weekend depth check
> Public order-book snapshot · estimated only · no order sent

Show a simple comparison for the current position size and one counterfactual size. If the data is unavailable, show the honest unavailable state.

### Task 4.4: Verify failure and non-execution boundaries

Test empty books, one-sided books, insufficient depth, stale timestamps, invalid prices, and network timeout. Confirm no order endpoint exists in the path and no account permission is requested.

---

# Phase 5: Make the decision transformation more visible

### Task 5.1: Improve counterfactual result framing

**Objective:** Make one user action visibly transform the risk conclusion.

**Files:**
- Modify: `web/components/dossier/CounterfactualControls.tsx`
- Modify: `web/components/dossier/DossierPage.module.css`
- Test: `web/tests/domain/counterfactuals.test.ts` or current equivalent

**Required behavior:**
- Preserve current size and leverage controls.
- Show before and current values in a compact delta row.
- When leverage increases, display the liquidation distance delta and a plain-language interpretation.
- Keep refusal behavior at leverage <= 1 and >25.
- Do not introduce buy/sell or safe/unsafe claims unless the deterministic policy explicitly supports the wording.

### Task 5.2: Add one high-signal scenario preset

**Objective:** Give judges a fast, deterministic counterfactual without turning the intake into a feature menu.

**Preset:** `Stress at 10x` for the active asset and direction.

It must be a UI convenience that calls the same existing recomputation path. It must not hardcode a result. Add a test proving the output equals the engine result for 10x.

### Task 5.3: Add an asset-tail contrast without a comparison page

**Objective:** Let the user move from NVDA to MSTR and see why asset selection matters.

Use the existing natural-language intake or a small sample control, not a new page. The video can show:

```text
rNVDA → historical worst -18.45%
rMSTR → historical worst -61.74%
```

The UI must always label each result with its asset. No claim that one asset is safer for every trade.

---

# Phase 6: Give the judge one actionable, non-prescriptive conclusion

### Task 6.1: Create a deterministic risk interpretation helper

**Objective:** Turn the existing numbers into a concise human-readable conclusion without issuing an order instruction.

**Likely files:**
- Create: `web/src/engine/risk-interpretation.ts`
- Test: `web/tests/engine/risk-interpretation.test.ts`
- Modify: `web/components/dossier/*`

**Inputs:** liquidation distance, worst observed gap, gap-through-liquidation rate, funding carry, sample size, provenance state.

**Output categories:** descriptive only, for example:

- `Observed history did not reach the current liquidation line, but the tail remains material.`
- `The historical sample includes outcomes through the proposed liquidation distance.`
- `Evidence is incomplete, so no historical conclusion is shown.`

Do not output `BUY`, `SELL`, `HOLD`, `SAFE`, or `UNSAFE` unless explicitly approved as a product decision and supported by documented deterministic policy.

### Task 6.2: Place the conclusion above the fold in the dossier

**Objective:** Ensure a judge does not need to synthesize five cards to understand the result.

Show the conclusion near the main risk metrics with a provenance label and a link to HOW. Keep the full evidence table below.

### Task 6.3: Narration alignment

The narration route may paraphrase the deterministic interpretation, but it must not invent a stronger conclusion. Add tests for:

- valid numeric claims only
- no trade signals
- unavailable evidence produces degraded narration
- replay versus live labels are preserved

---

# Phase 7: Align README and judge-facing documentation

### Task 7.1: Rewrite README around BaseRate's own thesis

**Objective:** Make README accurate, distinctive, and submission-ready without comparisons.

**File:**
- Modify through Antigravity: `/home/ubuntu/baserate/README.md`

**Required README structure:**

1. One-sentence thesis
2. Named user
3. The exact Decision Stress Testing question BaseRate answers
4. Complete research task flow
5. What is live observed versus pinned replay
6. Historical matching explanation
7. Bitget-native risk calculations
8. Counterfactual decision reshaping
9. Scorekeeper replay loop and honest live limitation
10. LLM role and deterministic boundary
11. Refusal and safety behavior
12. Live demo link
13. Verification commands
14. Submission-aligned six-part project-description draft or link to an internal non-judge document, without exposing private process

### Task 7.2: Remove unsupported and stale statements

**Required search gates:**

```bash
cd /home/ubuntu/baserate
rg -n "No current tool answers that|only tool|only desk|every Monday.*new|live scheduled|autonomous persistence|100% accurate|SHA-256|github.com" README.md web/app web/components
```

Expected:
- No broad uniqueness claim.
- No stale SHA-256 claim.
- No GitHub links in judge-facing UI.
- GitHub may remain in submission materials where appropriate, but not as a computed-source link in the product UI.
- No competitor names.

### Task 7.3: Add the product's distinctive positioning

Use this product-only positioning:

> BaseRate is a read-only pre-trade stress desk for leveraged rToken weekend positions. It combines asset-specific historical weekend base rates with Bitget-native frozen-collateral and funding math, then exposes the inputs, formulas, source status, and replay calibration behind every conclusion. The human decides.

Do not use comparative language such as "unlike other desks" or "the only product."

---

# Phase 8: Full verification and judge rehearsal

### Task 8.1: Unit and integration gates

Run from `web/`:

```bash
npm test
npx tsc --noEmit
npm run build
npm run demo:verify
```

Expected: every existing test remains green plus all new tests. Record exact counts from command output.

### Task 8.2: Provenance audit

Verify on the live page:

- Live Bitget snapshot has a timestamp and live label.
- Pinned replay distribution has a generation/source label.
- Computed values have HOW inputs/formulas.
- Estimated depth values say estimated.
- Unavailable live data does not become a fake zero.
- Replay Scorecard says replay.

### Task 8.3: Five-asset regression pass

Run and visually inspect:

- rNVDA default
- rTSLA 5x
- rAAPL short
- rQQQ
- rMSTR high-tail case
- unsupported rAMD
- invalid leverage 40x
- negative margin

Expected: correct asset-specific sample/date/distribution, deterministic risk values, named refusal states, no stale NVDA labels on other assets.

### Task 8.4: Mobile and desktop visual pass

Use a production URL and capture at minimum:

- 390x844 mobile landing
- 390x844 mobile dossier
- 1440px desktop landing
- 1440px desktop dossier

Check:

- no mobile side gutters
- no horizontal overflow
- live/replay labels readable
- HOW and matching disclosures usable by touch
- depth card does not push the main trade result below an unreasonable scroll position
- counterfactual delta is visible after interaction

### Task 8.5: Hostile judge rehearsal

The operator must be able to complete this path in 90 seconds:

1. Open the public URL.
2. Enter the golden rNVDA trade.
3. Point to the matching rationale.
4. Show 1,227 episodes and full distribution.
5. Open HOW on liquidation.
6. Trigger 10x counterfactual.
7. Show live market-source status and click Bitget source.
8. Switch to MSTR and show the different historical tail.
9. Open replay Scorecard and show 10/12 plus a provisional regime.
10. Try rAMD and show refusal.

The video must not imply that the current visitor's new trade will be persisted and graded on Monday.

---

# Phase 9: Deployment and submission checkpoint

### Task 9.1: Production deployment verification

After Antigravity's implementation and Hermes's independent audit:

- Commit only after Johnson's approval.
- Push to `main` only after Johnson's approval.
- Wait for Vercel READY.
- Verify all routes return 200.
- Verify production HTML includes the new labels and excludes stale claims.
- Verify `GMI_API_KEY` remains encrypted in Vercel and absent from Git.

### Task 9.2: Submission package alignment

Prepare, but do not submit without Johnson's approval:

- Project Description with six required parts
- Role of the LLM field
- Submission Materials Link
- Accessible demo URL
- Video link
- Compliant X promotional post including required hashtag, mention, interactive product introduction, and official quote/retweet requirement
- Track 3 → Decision Stress Testing selected in the form

### Task 9.3: Final handbook re-check

Immediately before submission, retrieve the official handbook and form again. Verify:

- submission deadline
- required official X post URL
- exact track and sub-theme labels
- materials-field rules
- six Project Description parts
- Role of the LLM field
- current announcement and judging dates

If any field differs from this plan, mark it for review instead of assuming the old value remains current.

---

# Acceptance criteria

BaseRate is ready only when all of these are true:

- A judge understands the exact historical matching rationale.
- A judge can distinguish live observed values from pinned replay values.
- A judge can see a bounded depth/market-condition stress or an explicit honest unavailable state.
- A judge can change leverage and see a deterministic, understandable risk delta.
- A judge receives a concise descriptive conclusion without an automated trade instruction.
- A judge can verify live public sources by clicking links.
- A judge can reconstruct computed values through HOW disclosures.
- Replay scorekeeping is clearly labelled as replay, not falsely presented as live persistence.
- The README contains only BaseRate's own thesis and no competitor references.
- All refusal, degraded, unavailable, mobile, and cross-asset paths pass.
- `npm test`, `tsc`, `build`, and `demo:verify` pass.
- Production deployment is READY and manually rehearsed.

# Recommended implementation order

1. Phase 0 truth inventory
2. Phase 1 public-claim corrections
3. Phase 2 matching explanation
4. Phase 5 counterfactual presentation
5. Phase 6 actionable interpretation
6. Phase 3 live evidence layer
7. Phase 4 depth stress, only if the existing order-book data supports a truthful calculation
8. Phase 7 README rewrite
9. Phase 8 verification
10. Phase 9 deployment and submission packaging

This order protects the product from adding visible complexity before its claims are correct and keeps the distinctive wedge clear: **historical weekend base rates plus exact Bitget-native risk for the trade in front of the human.**

# Explicitly deferred

- Live Friday/Monday cron
- Persistent per-user forecast database
- Portfolio-aware book analysis
- Autonomous execution
- Debate or multi-agent thesis chamber
- Broad news/filings ingestion
- Additional asset families
- New scoring systems

These are not required to prove the Decision Stress Testing thesis and would increase submission risk without improving the core evidence proportionally.

# Handoff instruction

When execution starts, dispatch each phase to Antigravity with exact file scope and acceptance tests. Hermes must review the worker output against this plan, run the gates independently, and send a correction specification if any claim, visual state, formula, provenance label, or test result does not match. Do not modify implementation files directly.

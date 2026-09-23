# BaseRate Claim Inventory & Truth Audit

**Audit Date:** 2026-09-23<br>
**Auditor:** Antigravity (Phase 0 / Phase 1 baseline; Phase 7 final reconciliation)<br>
**Scope:** Public demo claims across README, Landing page, Overview page, Scorecard, Dossier, and fixtures.<br>
**Policy:** Product-only framing; zero competitor names; explicit distinction between live evidence, pinned fixtures, deterministic computation, and replay demonstration.

---

## 1. Claim Inventory Matrix

| Claim | File/area | Status | Evidence | Approved wording |
|---|---|---|---|---|
| Live market snapshot in dossier calculation | `web/src/data/live-market-snapshot.ts`, `web/components/dossier/LiveMarketSnapshotStrip.tsx`, `web/app/dossier/page.tsx`, `README.md` | TRUE | `fetchLiveMarketSnapshot()` retrieves current Bitget spot ticker and funding rate with 4s bounded timeout, allowlist guard, and fail-closed UNAVAILABLE handling. LiveMarketSnapshotStrip displays LIVE OBSERVED with timestamp/values, or UNAVAILABLE with reason (pinned replay fallback). Appends observed/estimated bitget_live rows to evidence table. | "On Dossier load, current Bitget spot and funding are fetched live (4s bounded timeout, allowlist-guarded, fail-closed). A compact strip displays LIVE OBSERVED with retrieved timestamp and values, or UNAVAILABLE with reason and a note that pinned replay values are in use." |
| Pinned historical distribution | `web/src/data/replay-fixtures.ts`, `fixtures/replay-*.json` | TRUE | Full historical dataset verified by `scripts/demo-verify.mjs`: 1,227 NVDA Friday-to-Monday episodes (1999–2026), 736 TSLA episodes, 1,227 AAPL/QQQ/MSTR episodes. | "Full historical distribution computed from verified native-market daily closes (1,227 NVDA episodes back to 1999)." |
| Monday grading | `web/app/scorecard/page.tsx`, `web/src/scorekeeper/grader.ts`, `LandingPage.tsx`, `README.md` | REPLAY-ONLY | 12 historical weekend forecasts are graded in `FIXTURE_FORECAST_RECORDS`; no live cron or background scheduler grades arbitrary visitor sessions. | "Forecast grading and calibration loop demonstrated through 12 historical replay weekends reconstructed from native history." |
| Autonomous persistence | `web/src/scorekeeper/registry.ts`, `web/src/scorekeeper/ledger.ts`, `OverviewPage.tsx`, `LandingPage.tsx` | FUTURE | Registry and ledger run in-memory or on pinned fixtures; no database, user accounts, or persistent cloud storage are attached to visitor sessions. | "The deployed public demo is read-only and deterministic; it does not claim autonomous persistence or live Monday scheduling for visitor sessions." |
| Order-book & depth stress | `web/src/engine/depth-stress.ts`, `web/src/data/live-market-snapshot.ts`, `web/components/dossier/WeekendDepthCard.tsx`, `web/app/dossier/page.tsx`, `README.md` | TRUE | `computeDepthStress()` deterministically walks public Bitget order-book levels via VWAP accumulator against live spot reference and active counterfactual notional size; returns `ok` (LIVE OBSERVED), `insufficient_depth`, or `unavailable`. Verified by 13 unit tests and 9 live fetch tests. Adds `bitget_orderbook` evidence row. | "Current public Bitget order book is walked by a deterministic VWAP accumulator against the live spot reference and active counterfactual size. The weekend depth card displays LIVE OBSERVED, INSUFFICIENT DEPTH, or UNAVAILABLE states, estimated slippage, levels consumed, and a HOW disclosure detailing inputs and accumulation rules. Estimate only; zero orders sent." |
| Thin-book slippage | `web/src/engine/depth-stress.ts`, `web/components/dossier/WeekendDepthCard.tsx` | TRUE (bounded estimate) | `computeDepthStress()` calculates signed VWAP move and positive slippage cost percentage from top-of-book depth up to counterfactual position size. Labeled strictly as an estimate, never a guaranteed execution fill. | "Slippage is computed deterministically as a bounded top-of-book depth estimate for the counterfactual position size, labeled as an estimate and never an execution guarantee." |
| Historical matching rationale ("Why these weekends") | `web/components/dossier/match-explanation.ts`, `web/components/dossier/WhyTheseWeekendsCard.tsx`, `web/components/dossier/DistributionChart.tsx` | TRUE | `getMatchExplanation()` provides structured rationale: asset, direction, leverage, holding window, entry timing, regime, sample size, native history source/date range, and matching policy. Tested across all 5 assets. | "Dossier includes a dedicated 'Why these weekends' disclosure detailing exact matched parameters, sample size, date range, and the regime-tagged matching policy." |
| Deterministic risk interpretation | `web/src/engine/risk-interpretation.ts`, `web/components/dossier/RiskInterpretationCard.tsx` | TRUE | Pure function `interpretRisk()` evaluates liquidation distance against historical gap distribution; reports breached, buffer intact (with material tail warning), or evidence incomplete. Displayed above risk tiles with HOW formula. | "Every dossier carries a computed interpretation with three honest states (observed history did not reach liquidation line, historical sample breached liquidation line, evidence incomplete) with expandable HOW inputs." |
| Decision transformation panel & Stress at 10x preset | `web/components/dossier/DecisionTransformationPanel.tsx`, `web/app/dossier/page.tsx` | TRUE | Tracks original vs counterfactual liquidation distance delta in percentage points with plain-language description; includes 'Stress at 10x' preset invoking existing recomputation path. | "Decision transformation panel displays original vs current liquidation distance with percentage-point delta and plain-language summary; provides a 'Stress at 10x' preset for rapid stress testing." |
| LLM role & numeric safety | `web/app/api/narrate/route.ts`, `LandingPage.tsx`, `README.md` | TRUE | GMI DeepSeek model provides 2-sentence plain-English summaries; strict numeric guard rejects any output containing figures not present verbatim in the engine's JSON output. | "LLM provides a concise two-sentence summary under strict numeric validation guards; deterministic code computes every number." |
| Read-only & zero orders | `README.md`, `LandingPage.tsx`, `AppFrame.tsx`, `ParsedChips.tsx` | TRUE | Completely read-only. Zero private keys, zero wallet connectors, zero order endpoints, zero trade execution APIs. | "Read-only research desk; no orders, no execution, no account credentials; human decides." |
| Category uniqueness / "No current tool" | `README.md` line 46 | NOT-VISIBLE | Overbroad market-wide negatives ("No current tool answers that") are unsubstantiated and unnecessary. BaseRate's thesis stands independently. | "BaseRate is designed specifically for this problem: it combines asset-specific historical weekend base rates with Bitget-native frozen-collateral and funding math, then exposes the inputs, formulas, source status, and replay calibration behind every conclusion." |
| Weekend tape chart in landing hero | `web/components/landing/LandingPage.tsx` | TRUE | Static SVG illustration of weekend holding window; labeled as weekend tape preview rather than an active live websocket tape. | "Weekend tape preview showing Friday index freeze, liquidation distance, and cash-market reopen." |
| Replay scorecard volume (30 vs 12 weekends) | `README.md`, `ScorecardPage.tsx`, `scorecard/fixtures.ts` | REPLAY-ONLY | Verified fixture set contains exactly 12 graded replay records (10 hits, 2 misses). Stale references to "30 weekends" in README reconciled to 12. | "12 replayed weekends reconstructed from native market data with verified cryptographic ledger integrity." |
| Overview desk status pill | `web/app/overview/page.tsx` line 100 | REPLAY-ONLY | Changed from "Desk is live · grading Monday" to explicitly declare replay status. | "Replay mode · 12 graded weekends" |

---

## 2. Phase 0 Provenance Type Decision

**Context:** Task 0.3 outlined a potential `DisplayProvenance` union (`live_observed` | `pinned_replay` | `computed` | `estimated` | `replay_graded` | `unavailable`). Plan Requirement E states:
> "Phase 0 provenance type: do NOT invent a new domain type unless the existing type system truly needs it. Prefer the existing EvidenceLabel and provenance fields. If you decide no new type is necessary, record that decision in claim-inventory.md."

**Decision:** **No new domain type is created.**
- Existing type `EvidenceLabel` in `web/src/domain/types.ts` already provides:
  ```ts
  export type EvidenceLabel = 'observed' | 'estimated' | 'target' | 'replay' | 'computed';
  ```
- Combined with `ForecastMode` (`'live' | 'replay'`), `RefusalCode` (`'INSUFFICIENT_EVIDENCE' | 'UNAVAILABLE' | 'PARSE_UNCERTAIN'`), and `EvidenceItem` (`{ label: EvidenceLabel; source: string; timestampUtc: string | null; note?: string }`), the existing domain model fully represents data origin, status, and estimation boundaries.
- Reusing the existing types preserves compatibility across all 31 test files (286 tests) without unnecessary type churn.

---

## 3. Public Demo Boundary Specification

The official public boundary statement is integrated into natural trust surfaces (Landing FAQ and README Section 11):

> "The public demo uses pinned replay fixtures so every judge sees the same deterministic result. Live Bitget and Yahoo links expose current public evidence, alongside bounded live market and order-book depth observations. The scorekeeper loop is demonstrated with replay forecasts; this demo does not claim autonomous persistence or live Monday scheduling for each visitor's custom session."

---

## 4. Phase 7 Reconciliation Revision Note (2026-09-23)

- **Reconciliation Date:** 2026-09-23
- **Auditor:** Antigravity (Phase 7 documentation and claim alignment)
- **Summary:** Following the completion of Phases 2 through 6, BaseRate gained verified production capabilities:
  1. **Live market snapshot:** Added bounded 4s live Bitget spot ticker and funding rate retrieval with fail-closed UNAVAILABLE handling, fallback to pinned replay baseline values, and explicit provenance labeling (`observed` / `estimated` / `unavailable`).
  2. **Weekend depth check:** Added deterministic top-of-book VWAP walk for counterfactual position size, returning estimated slippage percentage, levels consumed, `INSUFFICIENT_DEPTH` honesty when book depth is exhausted, and `HOW` mathematical disclosure.
  3. **Why these weekends disclosure:** Added transparent match disclosure showing asset, trade shape, regime, sample size, date range, and matching policy.
  4. **Deterministic risk interpretation:** Added computed three-state interpretation card above risk tiles with inputs disclosure.
  5. **Decision transformation panel:** Added counterfactual delta tracking (percentage-point change in liquidation distance) and 'Stress at 10x' preset.
- **Audit Outcome:** All stale `NOT-VISIBLE` and `FUTURE` rows for features now implemented have been reconciled to `TRUE`. Matrix claims are verified against 286 automated tests, strict TypeScript (`tsc`), production build, and `scripts/demo-verify.mjs`. Framing remains strictly product-only with zero competitor names and zero comparison language.

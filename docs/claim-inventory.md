# BaseRate Claim Inventory & Truth Audit

**Audit Date:** 2026-09-23  
**Auditor:** Antigravity (Phase 0 / Phase 1 implementation)  
**Scope:** Public demo claims across README, Landing page, Overview page, Scorecard, and fixtures.  
**Policy:** Product-only framing; zero competitor names; explicit distinction between live evidence, pinned fixtures, deterministic computation, and replay demonstration.

---

## 1. Claim Inventory Matrix

| Claim | File/area | Status | Evidence | Approved wording |
|---|---|---|---|---|
| Live market snapshot in dossier calculation | `web/app/dossier/page.tsx`, `fixtures.ts`, `README.md` | NOT-VISIBLE | `getFixtureBundle()` feeds pinned fixture prices and funding rates into render math; live Bitget/Yahoo REST endpoints are exposed via outbound source links in `EvidenceTable.tsx`. | "Deterministic calculations run against pinned baseline fixtures, with live public Bitget and Yahoo REST links exposing current evidence." |
| Pinned historical distribution | `web/src/data/replay-fixtures.ts`, `fixtures/replay-*.json` | TRUE | Full historical dataset verified by `scripts/demo-verify.mjs`: 1,227 NVDA Friday-to-Monday episodes (1999–2026), 736 TSLA episodes, 1,227 AAPL/QQQ/MSTR episodes. | "Full historical distribution computed from verified native-market daily closes (1,227 NVDA episodes back to 1999)." |
| Monday grading | `web/app/scorecard/page.tsx`, `web/src/scorekeeper/grader.ts`, `LandingPage.tsx`, `README.md` | REPLAY-ONLY | 12 historical weekend forecasts are graded in `FIXTURE_FORECAST_RECORDS`; no live cron or background scheduler grades arbitrary visitor sessions. | "Forecast grading and calibration loop demonstrated through 12 historical replay weekends reconstructed from native history." |
| Autonomous persistence | `web/src/scorekeeper/registry.ts`, `web/src/scorekeeper/ledger.ts`, `OverviewPage.tsx`, `LandingPage.tsx` | FUTURE | Registry and ledger run in-memory or on pinned fixtures; no database, user accounts, or persistent cloud storage are attached to visitor sessions. | "The deployed public demo is read-only and deterministic; it does not claim autonomous persistence or live Monday scheduling for visitor sessions." |
| Order-book & slippage stress | `web/src/engine/risk-engine.ts`, `LandingPage.tsx`, `README.md` | FUTURE | Current engine implements `computeLiquidationDistance`, `computeFundingCarry`, and `computeWorstGap`. Thin-book order depth stress is planned for subsequent phases. | "Current desk computes liquidation distance and funding carry against frozen collateral; public order-book depth stress is planned for subsequent phases." |
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
- Reusing the existing types preserves compatibility across all 22 test files (191 tests) without unnecessary type churn.

---

## 3. Public Demo Boundary Specification

The official public boundary statement is integrated into natural trust surfaces (Landing FAQ and README Section 11):

> "The public demo uses pinned replay fixtures so every judge sees the same deterministic result. Live Bitget and Yahoo links expose current public evidence. The scorekeeper loop is demonstrated with replay forecasts; this demo does not claim autonomous persistence or live Monday scheduling for each visitor's custom session."

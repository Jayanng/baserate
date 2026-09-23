# Audit findings: Phases 6-10 (Dossier UI, narration, Overview, Scorecard, Landing, replay fixtures)

**Audit date:** 2026-09-23
**Auditor:** Hermes (independent re-verification; all page/route/component source read in full, gates re-run, live narration probes and rendered-path checks executed from scratch)
**Scope:** BUILD-PLAN.md Phases 6-10 as implemented: Dossier page + narration API (Phase 6/6.5), Overview (Phase 7), Scorecard (Phase 8), Landing (Phase 9), replay fixtures multi-asset (Phase 10/10.7).
**Remediation:** All defects fixed by Antigravity (gemini-3.8-flash-high, scoped dispatch `proc_1896799cd2fb`), then independently re-verified by Hermes.

---

## 1. Verdict

**PASS after four defects found, fixed by Antigravity, and re-verified clean.** Final state: 173/173 tests, tsc clean, build green, demo:verify green, all grep gates pass, live narration success rate restored, rendered pages truthful.

## 2. What checked out clean (verified, no action)

- **Scorecard math:** hero 83% = 10 hits / 12 graded derived from `computeCalibration` over fixture records; per-regime sums match; 2/2 regimes show 100% observed but `Provisional` status; single replay disclosure + honest "Reference dataset: rNVDA" note.
- **RegimeTable:** sort order (adjusted → provisional → reliable) matches spec; pending counts rendered separately as "(N pend.)"; accuracy bars derived from records, not hardcoded.
- **RecordDonut:** segment dasharray math consistent (10/2/2 of 12 = 60/20/20%); no false calibration claim on Overview.
- **CounterfactualControls:** survival wording computed from engine values (`liqAbs` vs `gapAbs`), no DOM arithmetic; `leverage <= 1` renders honest "NONE"; slider recompute wired to real `computeLiquidationDistance`/`computeFundingCarry`.
- **Number guard mechanics:** `extractAllowedNumbers` correctly admits fixture numbers (38, -18.4521, 1227) and rejects foreign ones (2026, 60) — verified by simulation.
- **Degraded paths:** missing key → `narration_disabled`; parse failure, missing dossier, provider failure all return `narration: null` with HTTP 200; skeleton → null rendering verified in page source.
- **Fixture integrity:** all six datasets pass demo:verify invariants (episodes > 500, ledger.verified, distribution sums 100, calibration ≥ 8 graded).
- **Landing (Phase 9 + polish):** all nav anchors resolve to real sections; no invented metrics; CTA labels unified; footer hackathon line present.

## 3. Defects found, fixed, and re-verified

### F-4 (HIGH): Narration route starved a reasoning model's token budget

- **Observed (live, 6 probes through the real route):** 2/6 attempts returned `finish_reason: length` with **empty content** (DeepSeek-V4-Flash spent the entire 120-token budget on `reasoning_content`), others truncated mid-sentence ("...worst historical", "...closed up, while"). Direct API probes at 512 tokens: 5/5 non-empty.
- **Expected:** narration should succeed reliably; a half-sentence desk summary undermines the LUI-fluency criterion.
- **Root cause:** `max_tokens: 120` sized for a non-reasoning model.
- **Fix:** `max_tokens: 600` in `app/api/narrate/route.ts`; new test asserting the request body sends 600; existing guard/degraded behavior untouched.
- **Re-verification (mine):** 6 fresh live probes: 4/6 full narrations (167-224 chars), 2/6 `number_guard_triggered` — **zero empty-content failures**. The remaining degraded attempts are the number guard doing its job (model stated a non-dossier number), which is correct-by-design behavior, not a defect.

### F-5 (MEDIUM): Scorecard claimed "SHA-256"; ledger is FNV-1a

- **Observed:** `app/scorecard/page.tsx` subtitle "Immutable SHA-256 hash-chained log..." while `src/scorekeeper/ledger.ts` hashes via 32-bit FNV-1a (`hashString`). Also `LedgerTable` rendered `entryHash.slice(0, 8) + '...'` — the ellipsis implies truncation of a longer hash, but FNV-1a hex is exactly 8 chars.
- **Expected:** the trust page must not make a false cryptography claim a code-reading judge can falsify in one grep.
- **Fix:** copy changed to "Immutable hash-chained log..."; every `SHA-256` occurrence removed (grep = 0 across web/); misleading `...` removed.
- **Re-verification (mine):** grep `SHA-256` = 0 in source and in the rendered `/scorecard` HTML; hash implementation untouched (12-entry chain still verifies).

### F-6 (MEDIUM): Activity feed fabricated a band-adjustment event

- **Observed:** Overview feed item "Band widened by +1.0pp for squeeze regime post-miss" — but the real rNVDA dataset has `bandAdjustments: []` (no adjustment ever occurred). A judge cross-checking Overview against Scorecard sees a claimed event the data contradicts. Funding item was also a frozen "+0.022%" string.
- **Fix:** adjustment item replaced with a truthful standing-policy line ("Band adjustment rule armed: regimes below 70% across 5+ forecasts auto-widen" / "standing rule"); funding item now derived from `FIXTURE_FUNDING_RATE` at render (`+0.022%` verified identical output, now guaranteed in sync).
- **Re-verification (mine):** rendered `/overview` HTML contains the truthful rule line, "standing rule", and the fixture-derived funding string; `+1.0pp` grep = 0.

### F-7 (LOW): Demo weekend dates could read as live dates

- **Observed:** Overview header "Saturday, September 26, 2026" and WeekendStrip "Sep 25 – 28" had no demo framing; JourneyStepper carries no dates (confirmed, left alone).
- **Fix:** "Demo weekend:" prefix on the Overview subtitle; "Demo weekend · Sep 25 – 28" on the strip.
- **Re-verification (mine):** both labels present in rendered HTML (2 matches).

## 4. Non-defect observations (documented, no action)

- `number_guard_triggered` degraded narration (2/6 live attempts) is the guard functioning; the model occasionally reaches for "2026" or "60 hours" which are not in the payload. Cost: occasional missing summary card; never a false number. Acceptable; could be tuned later by admitting the holding-hours constant into the payload.
- Narration success is network-dependent by design; the offline demo path renders the dossier identically with `narration: null` (verified).
- `ACTIVITY_ITEMS` "Monday forecast grade due" item remains a forward-looking statement consistent with the demo framing.
- Ledger display truncation `forecastId.slice(0, 8)` shows 8 chars of `fc_repl…`-style ids — ids are fixture-stable, join integrity verified.

## 5. Gates after remediation (all run by Hermes)

- `npm test`: **19 files, 173/173 passing** (includes 2 new narrate tests: max_tokens 600 assertion, reasoning-model empty-content handling).
- `npx tsc --noEmit`: exit 0.
- `npm run build`: green, all routes prerendered, `/api/narrate` dynamic.
- `npm run demo:verify`: exit 0.
- Grep gates: `SHA-256` = 0; `max_tokens: 600` present; `+1.0pp` = 0; `Demo weekend` × 2 (both rendered live).
- Live narration: 4/6 full success, 2/6 guard-rejected, 0 empty/truncated — materially better than the 2/6 empty + truncated pre-fix baseline.

## 6. Remaining risks

1. Repo checkpoint still not pushed (all phases + both audits uncommitted beyond `4ed5c53`).
2. Windows verification (Phase 11) pending.
3. GMI endpoint availability remains a live dependency for narration only; demo correctness does not depend on it.

# BaseRate

**Bitget AI Base Camp Season 2 · Track 3: AI Trading Desk · Sub-theme: Decision Stress Testing**

> Stop guessing. Get the base rate for your trade.

BaseRate is a read-only pre-trade stress desk for leveraged rToken weekend positions. It combines asset-specific historical weekend base rates with Bitget-native frozen-collateral and funding math, then exposes the inputs, formulas, source status, and replay calibration behind every conclusion. The human decides.

Dossier, not signal. Computed, not vibes. And a desk that keeps score on itself.

## 1. Hackathon alignment

| Field | Answer |
|---|---|
| Hackathon | Bitget AI Base Camp Season 2 |
| Track | Track 3: AI Trading Desk |
| Sub-theme | Decision Stress Testing |
| Product | Pre-trade stress desk with a self-scoring forecast loop |
| Named user | rToken weekend holders: leveraged tokenized-stock positions held from Friday cash close to Monday reopen |
| Signature capability | Full-history regime matching plus a calibration ledger demonstrated through replay |
| Human-in-the-loop | The desk researches, computes, and grades itself. The human decides. |
| Rails | Bitget public REST (spot + futures), bitget-mcp-server, public native-market history |
| Access model | Read-only. No API keys. No orders. No account connections. |

### Why this fits Decision Stress Testing

The sub-theme asks for tools that retrieve historically similar scenarios and stress test a decision before it is made. BaseRate addresses that brief through three connected capabilities:

- It retrieves historically similar scenarios from decades of native-market history and returns the complete outcome distribution.
- It stress tests the exact trade the user is considering, including Bitget's weekend collateral mechanics and order-book depth.
- It demonstrates forecast accountability by treating stress reports as registered forecasts and verifying them against real reopen outcomes in replay mode. Stress testing is applied to the desk itself.

## 2. The problem

rTokens made US stocks trade 24/7, creating a weekend risk window that requires its own analysis.

A trader who holds a leveraged rToken position over the weekend faces a structure that must be modeled explicitly:

- The UTA margin index for stock tokens is fixed while the native US market is closed. Collateral valuation freezes on Friday.
- Crypto collateral marks and perpetual funding keep moving all weekend. The part of the account that can liquidate the trader stays live while the part that defines the liquidation line is frozen.
- Weekend order books are thin. Slippage assumptions built on weekday tapes are wrong on Saturday night.
- When the cash market reopens on Monday, the reference price for collateral can jump. Weekend gaps land on the trader at reopen.

So the real question before a weekend trade is not "will NVDA go up?" It is: out of every time the market looked like this, what happened next, and what does that do to my collateral on a frozen index with live funding?

BaseRate is designed specifically for this problem: it combines asset-specific historical weekend base rates with Bitget-native frozen-collateral and funding math, then exposes the inputs, formulas, source status, and replay calibration behind every conclusion. A report is not a base rate. A base rate without a track record is a guess. BaseRate is the full loop.

## 3. Named user

**The rToken weekend holder.** A crypto-native trader on Bitget who holds tokenized US stocks (rNVDA, rTSLA, rAAPL, and similar names) as leveraged positions from Friday cash close to Monday reopen, funded by USDT or crypto collateral in a unified account. They check the account on Saturday night and no tool tells them their true risk.

Not the target user: people who want an AI to trade for them, long-only cash investors, or execution-algorithm users. BaseRate never executes anything.

## 4. What BaseRate does

The pipeline, end to end:

**Step 1. Plain-English trade intake.** "I want to long rNVDA over the weekend at 3x with 5,000 USDT margin." The desk parses the trade shape: asset, direction, size, leverage, holding window, and collateral.

**Step 2. Live market snapshot & Bitget-native risk math.** Deterministic code, no model in the calculation loop:

- **Live market snapshot layer:** On Dossier load, current Bitget spot and perp funding rates are fetched live (4-second bounded timeout, allowlist-guarded, fail-closed). A compact status strip shows `LIVE OBSERVED` with retrieved timestamp and values, or `UNAVAILABLE` with reason and an explicit note that pinned replay values are in use for calculations. Adds observed and estimated `bitget_live` evidence rows.
- **Friday-freeze collateral math:** Models Bitget UTA margin rules: which mark controls collateral while the cash market is closed, and where the liquidation line sits against a frozen Friday index.
- **Funding carry:** Computes what perpetual funding costs or pays across closed US market hours (60 hours for weekend holds), derived from real stock perp funding history and proxy rates.
- **Weekend depth check:** Current public Bitget spot order book is walked by a deterministic VWAP accumulator against the live spot reference and active counterfactual size. A compact card reports `LIVE OBSERVED`, `INSUFFICIENT DEPTH`, or `UNAVAILABLE` states, estimated execution slippage percentage, and order-book levels consumed, accompanied by a `HOW` disclosure showing exact inputs and accumulation rules. This is strictly a bounded liquidity estimate; zero orders are sent. Adds `bitget_orderbook` evidence rows.
- **Gap exposure:** Quantifies Friday-close-to-Monday-open moves for the asset from verified native-market history.

**Step 3. History engine, matching disclosure & deterministic interpretation.** Decades of native-market daily history, organized into typed regimes by a deterministic classifier:

- **"Why these weekends" disclosure:** Plain-English breakdown displaying asset, direction, leverage, holding window, entry timing, regime, sample size, native history source/date range, and the exact matching policy (regime-tagged full distribution for these datasets).
- **Outcome distribution:** For the user's exact situation, BaseRate returns the full outcome distribution: out of N historical episodes in this regime, how often the asset closed down, gapped through liquidation levels, and its worst historical drawdown. Every number is traceable to dated source data. When history is insufficient, the desk refuses honestly: `INSUFFICIENT_EVIDENCE`.
- **Deterministic risk interpretation:** Every dossier carries a computed interpretation with three honest states:
  1. *Observed history did not reach the liquidation line* (with explicit warning that tail risk remains material).
  2. *Historical sample includes outcomes through the liquidation distance*.
  3. *Evidence incomplete* (no conclusion shown).
  Displayed prominently above the risk tiles, labeled computed, with a `HOW` disclosure detailing exact inputs.

**Step 4. Live counterfactuals & decision transformation.** Drag the size slider, switch entry timing, or adjust leverage:

- **Decision transformation panel:** Directly compares the original trade shape against the current counterfactual state, displaying the liquidation distance before and after, the percentage-point delta, and a plain-language summary of how the risk shifted.
- **"Stress at 10x" preset:** A convenience preset that immediately tests position survivability at high leverage using the existing recomputation path.
- Every figure recomputes in under a second against the same history because outcome tables are precomputed. The trader reshapes the trade until the risk is acceptable to them.

**Step 5. The Scorekeeper.** In the replay scorekeeper, past dossiers are registered as forecasts in an append-only ledger. At Monday reopen, the desk grades itself: did the asset close inside the issued band? Was the collateral stress within the stated worst case? Per-regime accuracy, published miss rates, and deterministic band adjustments demonstrate the calibration loop.

The human reads the dossier and decides. BaseRate never signals, never suggests entries, never touches an order.

## 5. The Scorekeeper: a desk that keeps score

This is the wedge. Stress reports today are typically fire-and-forget: generate, read, close, never revisited. BaseRate closes that loop:

- **Forecast registry.** Each replay dossier stores its issued bands, regime tag, and a cryptographic hash chain, so past reports cannot be edited.
- **Monday grading.** Real outcomes after cash reopen are compared to issued bands in replay mode. Hits and misses are both published, side by side, forever.
- **Calibration report.** Per regime: how often issued bands contained reality, hit rates, and provisional regime indicators.
- **Trust badges in reports.** Transparent regime reliability indicators: regimes with fewer than 5 graded forecasts are flagged as provisional.
- **Band adjustment.** If a regime's accuracy drops below 70% across 5+ forecasts, band width widens deterministically by 0.5pp per miss.

### How BaseRate learns (and the honest limits)

What learns: the deployed demo demonstrates how measured error rates adjust thresholds and band widths per regime in replay mode. Monday's grade changes Friday's output. That is how real desks calibrate.

What does not learn: no neural network retrains, no hidden re-weighting of history, and the language model never learns numbers. It narrates only. The ledger is append-only, so the desk cannot quietly make its past calls look better. Misses stay on the same screen as hits.

**Replay mode.** A brand-new desk has no live grades yet. So BaseRate replays the past: it re-issues what it would have said for the last 12 weekends using only data frozen before each weekend, then scores those against what actually happened. The mechanism, math, and ledger are identical to live grading. Every replayed number is labeled `REPLAY` so nobody mistakes it for a live call. Honesty about replay is part of the product.

## 6. BaseRate's core capabilities

BaseRate combines six capabilities into one decision workflow:

1. **Bitget-native weekend risk & depth stress.** The desk models frozen Friday collateral, funding carry across closed market hours, historical weekend gap distributions against the liquidation line, and a live weekend order-book depth check that computes estimated slippage and levels consumed via a deterministic VWAP accumulator (with honest `INSUFFICIENT_DEPTH` states).
2. **Live market snapshot layer.** Bounded live fetch (4s timeout, allowlist-guarded, fail-closed) observes current Bitget spot prices and perp funding rates, labeling provenance explicitly as `LIVE OBSERVED` or falling back to pinned replay values labeled `UNAVAILABLE`.
3. **Full-history base rates & matching rationale.** A deterministic regime engine organizes decades of native-market history and returns the complete distribution of observed outcomes. A dedicated "Why these weekends" disclosure details the trade shape, regime, sample size, date range, and matching policy.
4. **Deterministic risk interpretation.** A computed three-state interpretation card above the risk tiles states whether observed history breached the liquidation line, remained within buffer (with material tail warning), or is incomplete, complete with `HOW` formulas and inputs.
5. **Live counterfactuals & decision transformation.** Interactive controls for position size, leverage, entry timing, and holding window, plus a Decision Transformation Panel showing liquidation distance delta (percentage points) and a "Stress at 10x" convenience preset. All risk numbers recompute instantly.
6. **Self-scoring forecasts & reproducible research.** Forecast accountability demonstrated through an append-only cryptographic ledger of 12 historical replay dossiers, evaluating issued bands against actual reopen outcomes. All figures computed deterministically; the language model narrates a sanitized summary under strict numeric validation guards.

| Decision Stress Testing capability | BaseRate implementation |
|---|---|
| Historical scenario retrieval | Full-history regime matching with typed regimes, dated evidence, and "Why these weekends" matching disclosure |
| Trade stress testing | Friday-freeze calculator, funding carry, gap table, live market snapshot, and weekend order-book depth stress (bounded estimate) |
| Risk interpretation | Deterministic three-state interpretation card (breached / within buffer / incomplete) with mathematical `HOW` disclosures |
| Interactive decision support | Continuous counterfactual controls, Decision Transformation Panel with delta tracking, and "Stress at 10x" preset |
| Forecast accountability | Append-only registry, Monday reopen grading via replay mode, calibration report, and deterministic band adjustments |
| Human-in-the-loop | Read-only research desk. The human decides. |
| Evidence and safety | Provenance for every figure (`observed`, `estimated`, `computed`, `replay`, `unavailable`), refusal states, no execution, no account keys |

## 7. Product surfaces: four pages maximum

BaseRate is intentionally limited to four pages:

1. **Landing.** Explains the weekend rToken problem, the BaseRate workflow, the scorekeeping idea, and opens the desk.
2. **Overview.** Shows the active weekend exposure, frozen collateral state, funding status, weekend timeline, current warnings, and entry points into the dossier and scorecard.
3. **Dossier.** Provides one natural-language trade intake field, parsed trade details, deterministic Bitget-native stress calculations, historical outcome distribution, evidence, and live counterfactual controls. It is a structured workbench, not a persistent chat interface.
4. **Scorecard.** Shows calibration, issued bands versus actual outcomes, regime accuracy, replay results, misses, band adjustments, and the append-only forecast ledger.

Supporting details remain inside these pages as drawers, expandable evidence panels, or focused states. There is no separate chat page, settings page, weekend-map page, or ledger page.

## 8. Architecture

- **Deterministic core.** Every number is computed by code with pinned inputs. Same inputs, same dossier, every time.
- **Regime classifier.** Deterministic and statistical: fixed, published feature windows bucket historical episodes into typed regimes. Reproducible by any judge with the code.
- **Narration layer.** The language model turns the computed dossier into prose. It receives sanitized summaries only, it never computes, and its output passes a forbidden-output gate that rejects trade signals and fabricated figures.
- **Refusal states.** `INSUFFICIENT_EVIDENCE`, `UNAVAILABLE` (with reason), `INSUFFICIENT_DEPTH`, `REPLAY` (label). The desk would rather refuse than guess.
- **Evidence labels.** Every figure is stamped `observed` (or `live_observed`), `estimated`, `computed`, `replay`, or `unavailable`.
- **No fabrication.** If an upstream source fails or times out, the field says `UNAVAILABLE` with an explicit reason and falls back to pinned baseline fixtures. Never interpolated, never invented.
- **Read-only.** No keys, no account connections, no orders, no transfers.

Repository layout:

```
baserate/
  README.md
  docs/
    claim-inventory.md
    architecture.md
    scorecard-spec.md
    data-provenance.md
  web/
    app/                 # Demo UI: landing, overview, dossier, scorecard, narrate API
    components/
      dossier/           # Risk tiles, depth card, snapshot strip, why weekends, transformation panel
      landing/           # Landing page with hero tape chart, FAQ, workflow overview
      scorecard/         # Calibration table, replay ledger, regime accuracy
      shell/             # App shell, navigation, global styling tokens
    src/
      data/              # bitget-client, yahoo-client, live-market-snapshot, replay-fixtures
      domain/            # types, trade-parser, validation, provenance
      engine/            # risk-engine, depth-stress, risk-interpretation, base-rate, classifier
      scorekeeper/       # grader, calibration, ledger, registry
    fixtures/            # Pinned multi-asset replay datasets (NVDA, TSLA, AAPL, QQQ, MSTR)
    tests/               # 31 test files, 286 automated tests
```

## 9. Data plan and provenance

| Source | Used for | Status |
|---|---|---|
| Bitget public REST (spot) | rToken tickers, live spot price snapshot, order book depth stress, daily candles | Verified live. Spot ticker and order book fetched on dossier load (4s timeout, allowlist-guarded, fail-closed). Candles use plain enums (`1day`). |
| Bitget public REST (futures) | Stock perp funding (live funding rate snapshot + history), perp candles | Verified live. Stock perps trade under plain tickers (NVDAUSDT, TSLAUSDT, QQQUSDT, and similar). Fetched live on dossier load; perp funding history used as overnight carry proxy. |
| bitget-mcp-server (agent.bitget.com/mcp) | Guide queries, analyst targets, cross-checks | Endpoint live, 67 documented data entries. Optional enhancer, not on the critical path. |
| Public native-market daily history | Decades of stock and index history for regime tables | Decided: Yahoo Finance public chart API, keyless. NVDA to 1999 (6,958 daily bars; 1,227 weekend episodes), TSLA to 2010 (736 episodes), AAPL, QQQ, MSTR. Fallback: Stooq. |
| Bitget published rules pages | Friday-freeze and margin-index behavior | Documented basis for collateral math. |

Every dossier ships its provenance: which source, which timestamp, which endpoint. Every figure is stamped `observed` (or `live_observed`), `pinned_replay`, `computed`, `estimated`, `replay_graded`, or `unavailable`. Numbers without provenance do not ship.

## 10. Rules and safety

What BaseRate will never do:

- Place, cancel, or close orders. Transfer or withdraw funds. Hold keys.
- Output BUY, SELL, LONG, SHORT, or any trade signal or confidence score.
- Fabricate data. Missing or timed-out input means `UNAVAILABLE` with an explicit reason, never an interpolation.
- Present replayed grades as live grades.
- Let a language model compute or alter any number.

Human decides. The desk researches, computes, and grades itself. That is the whole job.

## 11. Honest limitations

- **Public demo boundary:** The public demo uses pinned replay fixtures so every judge sees the same deterministic result. Live Bitget and Yahoo links expose current public evidence, alongside bounded live market and order-book depth observations. The scorekeeper loop is demonstrated with replay forecasts; this demo does not claim autonomous persistence or live Monday scheduling for each visitor's custom session.
- **Bitget public API availability & rate limits:** Bitget public REST endpoints are unauthenticated and subject to network conditions and rate limits. A 4-second bounded timeout ensures the dossier never hangs; if an endpoint fails or times out, the desk fails closed to an explicit `UNAVAILABLE` state with the reason shown and uses pinned baseline values for render math.
- **Weekend order-book depth is an estimate:** The weekend depth check walks public top-of-book levels at the moment of observation. It computes a deterministic VWAP slippage estimate for the counterfactual notional size; it is strictly an informational estimate, not an execution quote or fill guarantee. If requested size exceeds available book depth, it reports `INSUFFICIENT_DEPTH` rather than guessing.
- **rToken spot history & perp proxies:** rToken spot history begins at each token's Bitget listing (RNVDA: June 2025). Stock perp funding history covers the perp listing window (NVDA perp: since June 2026). Stock perp funding rates serve as proxies for rToken overnight carry where direct rToken funding is not traded, and are labeled estimated. Deep base rates come from multi-decade native cash-market history, and every figure is labeled with provenance so spot, perp, and cash data are never confused.
- **Replay calibration:** The calibration loop is demonstrated in replay mode over 12 past weekends. The mechanism is identical to live grading and clearly labeled `REPLAY`.
- **Regime taxonomies:** Regime taxonomies are product settings, not empirical optima. Sensitivity is shown rather than hidden.
- **Descriptive, not predictive:** Past distributions condition expectations. They are not guarantees, and the desk says so in every dossier.

## 12. Verification and testing

Run the full verification suite from `web/`:

```bash
cd web
npm test               # 31 test files, 286 tests green
npx tsc --noEmit       # Strict TypeScript check (zero errors)
npm run build          # Production Next.js build
npm run demo:verify    # Offline multi-asset fixture and shell reliability check
```

All 286 tests, strict type checking, Next.js production build, and multi-asset fixture verification pass deterministically without network dependencies.

## 13. The judge's 60 seconds

1. Type: "long rNVDA over the weekend at 3x, 5,000 USDT margin."
2. Dossier lands:
   - Live Market Snapshot strip displays `LIVE OBSERVED` spot and funding with timestamp (or `UNAVAILABLE` fallback note).
   - Weekend Depth Check card displays estimated slippage and levels consumed via VWAP accumulator (with `HOW` formula).
   - Friday-freeze liquidation line, weekend funding carry, gap table, and the full regime distribution with dates.
   - "Why these weekends" disclosure breaks down the matched asset, regime, sample size, and matching policy.
   - Deterministic Risk Interpretation card delivers a computed three-state risk statement above the risk tiles.
3. Test counterfactuals: drag size from 5,000 to 12,000 or click "Stress at 10x".
   - The Decision Transformation Panel shows the exact liquidation distance delta in percentage points with plain-language description.
   - Slippage and depth levels update dynamically.
   - Every number recomputes instantly against the same history.
4. Open the Scorecard: 12 replayed weekends, hit rate per regime, two labeled misses, one adjusted band with its reason.
5. Close on the thesis: every stress report is a claim about the future. BaseRate is the desk that demonstrates its score through replay calibration.

## 14. Thesis (submission form answer, drafted)

rTokens make US stocks trade 24/7, but collateral valuation freezes while the native US cash market is closed. BaseRate gives the weekend trader the base rate for their exact trade before they place it: asset-specific historical distributions, Bitget-native collateral math against a frozen index, and funding carry across closed hours. Past stress reports are evaluated through a deterministic replay scorekeeper that publishes its calibration and miss rate in an immutable ledger. A desk that grades itself in public is the trust step agentic trading needs next.

## 15. Submission checklist

- [ ] Track and sub-theme confirmed: Track 3, Decision Stress Testing
- [ ] Live demo URL (login-free)
- [ ] Demo video
- [ ] Repo link ready for judges
- [ ] Thesis answer finalized
- [ ] Named user stated (rToken weekend holders)
- [ ] All figures labeled observed / estimated / target / replay
- [ ] Refusal states demonstrated on camera
- [ ] Build-in-public posts for Fan Favorite and Best Spread lanes
- [ ] Read-only verified: no keys, no orders, no account connections

## 16. Glossary

- **Base rate:** how often something happened across all of history, not a prediction.
- **Regime:** a typed market situation (trend, chop, squeeze, capitulation) used to bucket historical episodes.
- **Dossier:** the computed report BaseRate issues for one trade shape.
- **Live market snapshot:** bounded live Bitget spot price and funding rate observed on dossier load.
- **Weekend depth check:** deterministic VWAP walk of public Bitget order-book levels for counterfactual position size.
- **Decision transformation:** comparative delta tracking between initial trade shape and counterfactual adjustments.
- **Forecast registry:** the append-only ledger of issued dossiers used for Monday grading.
- **Calibration:** measured agreement between issued bands and real outcomes, per regime.
- **Replay mode:** re-issuing and grading past dossiers from frozen data, always labeled REPLAY.

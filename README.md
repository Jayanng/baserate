# BaseRate

> Stop guessing. Get the base rate for your trade.

[![status: live demo](https://img.shields.io/badge/status-live%20demo-4f46e5)](https://baserate-ten.vercel.app)
![license: proprietary](https://img.shields.io/badge/license-proprietary-6b7280)
![built with: Next.js + TypeScript](https://img.shields.io/badge/built%20with-Next.js%20%2B%20TypeScript-4f46e5)
![data: Bitget public API + native market history](https://img.shields.io/badge/data-Bitget%20public%20API%20%2B%20native%20market%20history-84cc16)
![read-only: no keys, no orders](https://img.shields.io/badge/read--only-no%20keys%2C%20no%20orders-6b7280)

BaseRate is a read-only pre-trade stress desk for leveraged rToken weekend positions. It combines asset-specific historical weekend base rates with Bitget-native frozen-collateral and funding math, then exposes the inputs, formulas, source status, and replay calibration behind every conclusion. The human decides.

Dossier, not signal. Computed, not vibes. And a desk that keeps score on itself.

## Live Demo

BaseRate is live at **[baserate-ten.vercel.app](https://baserate-ten.vercel.app)** across four dedicated views:

- **[`/`](https://baserate-ten.vercel.app/):** Landing view introducing the weekend rToken risk problem, the stress testing workflow, and self-scoring methodology.
- **[`/overview`](https://baserate-ten.vercel.app/overview):** High-level operational view showing active weekend exposures, frozen collateral parameters, funding status, and market timelines.
- **[`/dossier`](https://baserate-ten.vercel.app/dossier):** Interactive workbench with plain-English trade intake, live Bitget market observations, deterministic risk math, regime matching, and live counterfactual controls.
- **[`/scorecard`](https://baserate-ten.vercel.app/scorecard):** Calibration scorecard tracking historical forecast bands against realized Monday cash reopen outcomes, regime accuracy, and band adjustments.

## The Problem

rTokens allow US equities to trade 24/7, introducing an asymmetric weekend risk window that standard risk tooling fails to model:

- **Frozen collateral valuation:** The Unified Trading Account (UTA) margin index for tokenized equities freezes when the underlying US cash market closes on Friday, anchoring collateral valuation to the Friday close.
- **Live debt and funding liabilities:** Cryptocurrency collateral marks and perpetual funding rates remain live all weekend—the liabilities that trigger liquidation continue moving while the collateral asset value is locked.
- **Thin weekend liquidity:** Weekend order books exhibit reduced depth, rendering weekday execution and slippage assumptions invalid.
- **Monday cash reopen gaps:** Price discovery accumulated over the weekend resolves abruptly at the Monday cash open, introducing gap risk directly against the frozen valuation benchmark.

The core question before entering a weekend position is not *"will the stock go up?"* It is: *across all historical episodes matching this market regime, what was the realized outcome distribution, and how does that distribution affect collateral on a frozen index with live funding?*

## How It Works

BaseRate executes a five-step deterministic workflow:

1. **Plain-English trade intake:** The desk parses natural-language prompts (e.g., *"long rNVDA over the weekend at 3x with 5,000 USDT margin"*) into an explicit trade specification defining asset, direction, notional size, leverage, entry timing, and collateral structure.
2. **Live market snapshot and risk math:** A bounded query (4-second timeout, fail-closed) captures public Bitget spot prices and perp funding rates, feeding deterministic calculations for Friday-freeze liquidation thresholds, 60-hour funding carry, order-book depth slippage estimates, and historical gap exposures.
3. **History engine, matching, and deterministic interpretation:** Multi-decade native-market daily records are bucketed into typed regimes by a deterministic classifier, outputting complete outcome distributions, an explicit "Why these weekends" matching disclosure, and a three-state deterministic risk interpretation.
4. **Live counterfactuals and decision transformation:** Traders modify position size, leverage, and entry timing interactively; the Decision Transformation Panel immediately recalculates liquidation distance deltas in percentage points against precomputed distributions.
5. **The Scorekeeper:** Past dossiers are recorded into an append-only ledger protected by a deterministic hash chain (FNV-1a), scoring issued forecast bands against realized Monday cash reopen prints to adjust regime calibration bands.

## What Makes It Verifiable

BaseRate exposes every calculation, parameter, and upstream dependency:

- **Explicit provenance labels:** Every displayed metric carries a clear provenance stamp: `observed` (or `live_observed`), `pinned_replay`, `computed`, `estimated`, `replay_graded`, or `unavailable`. Unlabeled values are not displayed.
- **Mathematical `HOW` disclosures:** Risk metric cards and depth estimators include expandable disclosures detailing exact mathematical formulas, pinned parameters, and raw inputs.
- **Live source links:** Each dossier provides direct external links to inspect public Bitget REST endpoints and native-market financial sources in real time.
- **Fail-closed refusal states:** The desk never fabricates or interpolates missing data. When upstream feeds fail, timeouts occur, or historical samples are insufficient, it halts with explicit refusal states: `INSUFFICIENT_EVIDENCE`, `UNAVAILABLE` (with cause), or `INSUFFICIENT_DEPTH`.
- **Deterministic interpretation states:** Risk posture is evaluated through three mutually exclusive computed outcomes:
  1. *Observed history did not reach the liquidation line* (with explicit disclosure that tail risk remains material).
  2. *Historical sample includes outcomes through the liquidation distance*.
  3. *Evidence incomplete* (no conclusion displayed).

<details>
<summary><b>Mathematical formulation and example disclosure</b></summary>

BaseRate computes the Friday-freeze liquidation distance deterministically:

```
Liquidation price (long) = entry x (1 - 1/leverage + 0.005)
Liquidation price (short) = entry x (1 + 1/leverage - 0.005)
Liquidation distance (%) = (liquidation price - entry) / entry x 100
```

Where:
- `0.005` is a fixed maintenance-buffer contract constant.
- Distance percent measures the distance between the frozen Friday entry/index price and the liquidation price.
- Funding carry and slippage are separate metrics with their own dedicated HOW disclosures (there is no MMR/Collateral Factor ratio and no carry or slippage terms in this formula).

**Worked example:**
- Entry: 228.2 USDT, 3x, long
- Liquidation price: 228.2 x (1 - 1/3 + 0.005) = 153.3 USDT
- Liquidation distance: (153.3 - 228.2) / 228.2 x 100 = -32.8%
</details>

## The Scorekeeper

Stress reports are traditionally fire-and-forget: produced prior to trade entry, read once, and never reconciled against reality. BaseRate closes this feedback loop by treating stress assessments as registered forecasts:

- **Forecast registry:** Each evaluated dossier stores its issued volatility bands, regime tag, and position parameters in an append-only ledger protected by a deterministic hash chain (FNV-1a), ensuring records cannot be retroactively altered.
- **Monday grading:** Realized prices from the Monday cash open are compared against Friday's issued expectation bands. Both forecast hits and misses are published side-by-side in perpetuity.
- **Regime calibration:** Forecast accuracy is tabulated independently across market regimes. Regimes with fewer than 5 graded forecasts display a `PROVISIONAL` status.
- **Deterministic band adjustments:** When a regime's empirical accuracy drops below 70% across 5 or more graded forecasts, expectation bands widen deterministically by 0.5 percentage points per miss.
- **Narrative isolation:** The language model acts exclusively as an explanatory narrator from pre-calculated metrics. It never performs calculations, cannot modify ledger entries, and operates under strict validation guards.

### Replay Mode Honesty

A newly initialized desk has no multi-year operational track record. BaseRate demonstrates its calibration and grading mechanics through historical replay: re-issuing what the desk would have generated across 12 consecutive historical weekends using strictly point-in-time data frozen prior to each weekend, then scoring those assessments against realized outcomes. The scoring mechanics, mathematics, and ledger verification are identical to live operation. Every replayed metric is explicitly labeled `REPLAY` so simulated evaluations are never mistaken for live calls.

<details>
<summary><b>Deterministic calibration adjustment rules</b></summary>

- **Provisional threshold:** Regimes with fewer than 5 graded forecasts display a `PROVISIONAL` indicator, signaling limited sample confidence.
- **Calibration penalty:** If a regime's empirical hit rate falls below 70% across 5 or more evaluated forecasts, the expectation band widens by 0.5 percentage points per miss.
- **Immutable chaining:** Ledger records chain previous block hashes via 32-bit FNV-1a, ensuring past forecast bands cannot be re-fitted or re-ordered after the fact.
</details>

## Key Capabilities

| Capability | Implementation |
|---|---|
| **Historical regime matching** | Decades of native market history categorized into typed regimes with complete outcome distributions and "Why these weekends" matching disclosures. |
| **Bitget-native stress math** | Friday-freeze collateral modeling, 60-hour funding carry math, historical weekend gap tables, and live market snapshot strips. |
| **Weekend depth stress** | Deterministic VWAP walk of public Bitget spot order books estimating slippage and consumed levels (with fail-closed `INSUFFICIENT_DEPTH` handling). |
| **Deterministic risk interpretation** | Three-state mathematical classification (within buffer with tail risk warning, breached liquidation, or incomplete evidence) with complete `HOW` disclosures. |
| **Interactive counterfactuals** | Dynamic controls for position size, leverage, and timing, paired with a Decision Transformation Panel tracking liquidation distance deltas in percentage points. |
| **Self-scoring forecast loop** | Append-only ledger secured by a deterministic hash chain (FNV-1a), scoring replayed dossiers against Monday cash reopen prints. |
| **Read-only verification & safety** | Provenance tags on all figures, explicit refusal states (`UNAVAILABLE`, `INSUFFICIENT_EVIDENCE`), zero trading keys, zero order execution. |

## Architecture

- **Deterministic core:** All numerical modeling and risk calculations execute in pure TypeScript with pinned parameter sets. Identical inputs yield identical outputs every time.
- **Statistical regime classifier:** Documented indicator windows categorize historical market episodes into discrete volatility regimes without subjective tuning.
- **Guarded narration:** The language model generates explanatory prose solely from computed metrics, bounded by strict numeric validation guards to prevent hallucinations or signal generation.
- **Fail-closed refusal states:** The system halts with `INSUFFICIENT_EVIDENCE`, `UNAVAILABLE`, or `INSUFFICIENT_DEPTH` rather than guessing when data is missing or out of bounds.
- **Strict provenance tracking:** Every metric is marked `observed`, `live_observed`, `pinned_replay`, `computed`, `estimated`, or `unavailable`.
- **Read-only design:** No wallet connections, no account keys, and no order execution capabilities.

```
baserate/
  README.md
  docs/
    design-system.md
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
    tests/               # automated test suite
```

## Data and Provenance

| Source | Used for | Status |
|---|---|---|
| **Bitget public REST (spot)** | rToken tickers, live spot price snapshot, order book depth stress, daily candles | Verified live. Fetched on dossier load with 4s timeout and fail-closed fallback. |
| **Bitget public REST (futures)** | Stock perp funding (live funding rate snapshot + history), perp candles | Verified live. Fetched on dossier load; perp funding history used as overnight carry proxy. |
| **bitget-mcp-server (`agent.bitget.com/mcp`)** | Guide queries, analyst targets, cross-checks | Verified live endpoint (67 documented entries); optional enhancer outside critical path. |
| **Public native-market daily history** | Decades of stock and index history for regime tables | Verified public data (Yahoo Finance chart API / Stooq fallback) spanning multi-decade daily bars. |
| **Bitget published rules pages** | Friday-freeze and margin-index behavior | Documented basis for UTA margin index and collateral liquidation rules. |

Every dossier ships with full provenance: source name, observation timestamp, and query endpoint. Every metric is stamped `observed` (or `live_observed`), `pinned_replay`, `computed`, `estimated`, `replay_graded`, or `unavailable`. Numbers lacking verified provenance do not ship.

## Safety and Limits

### What BaseRate Will Never Do

- Place, cancel, route, or execute orders of any kind.
- Request, store, or require private API keys, credentials, or wallet connections.
- Output directional signals, `BUY`/`SELL` recommendations, target prices, or win-rate probabilities.
- Fabricate or interpolate missing data—missing or timed-out upstream feeds immediately trigger explicit `UNAVAILABLE` states.
- Present replayed historical evaluations as live operational track records.
- Allow language models to perform calculations, modify numbers, or bypass validation rules.

### Honest Limitations

- **Public demo boundary:** The web demonstration relies on pinned replay fixtures to ensure deterministic, reproducible reviews. Live Bitget and Yahoo endpoints provide real-time observations, but the scorekeeper operates in replay mode without automated live Monday scheduling for arbitrary client sessions.
- **Bitget public API availability and rate limits:** Bitget REST endpoints are public and subject to upstream network latency and rate limits. A 4-second bounded timeout prevents UI hangs; if requests fail, the desk fails closed to `UNAVAILABLE` and falls back to baseline fixtures for display math.
- **Weekend order-book depth is an estimate:** Order-book depth stress walks top-of-book levels at the moment of request to compute a deterministic VWAP slippage estimate. It is an informational liquidity estimate only, not an execution quote or fill guarantee. If requested notional exceeds available book depth, it reports `INSUFFICIENT_DEPTH`.
- **rToken history and perp carry proxies:** Tokenized stock listings on Bitget date to June 2025 (e.g., rNVDA), and stock perpetual contracts date to June 2026. Perpetual funding histories serve as overnight carry proxies where direct rToken funding is absent and are stamped `estimated`. Deep historical base rates derive from native cash market history.
- **Replay calibration:** The self-scoring calibration loop is evaluated over 12 historical weekends in replay mode. Every replayed outcome is explicitly labeled `REPLAY`.
- **Regime taxonomy:** Regime classification boundaries are documented analytical configurations rather than absolute market truths. Sensitivity to parameter shifts is exposed rather than hidden.
- **Descriptive, not predictive:** Historical outcome distributions describe what occurred under similar historical conditions; they do not guarantee future performance.

## Verification

Run the verification suite from `web/`:

```bash
cd web
npm test               # Run the automated test suite
npx tsc --noEmit       # Strict TypeScript type check
npm run build          # Production Next.js build
npm run demo:verify    # Offline multi-asset fixture and shell verification
```

The test suite, strict type checking, production build, and fixture verification pass deterministically without network dependencies.

## Glossary

- **Base rate:** The empirical historical frequency of an event across documented market history, distinct from a prediction.
- **Regime:** A categorized market condition (trend, chop, squeeze, capitulation) defined by quantitative indicator thresholds.
- **Dossier:** A structured pre-trade risk report detailing liquidation math, depth estimates, historical distributions, and evidence.
- **Live market snapshot:** Real-time Bitget spot price and perpetual funding rate retrieved on demand under bounded timeouts.
- **Weekend depth check:** A deterministic VWAP walk of public order-book levels estimating slippage for a given position size.
- **Decision transformation:** Real-time delta tracking comparing original trade parameters against counterfactual adjustments.
- **The Scorekeeper:** An append-only ledger protected by a deterministic hash chain (FNV-1a) that evaluates issued expectation bands against realized Monday cash reopen outcomes.

## Links

- **Live Demo:** [baserate-ten.vercel.app](https://baserate-ten.vercel.app)
- **Design System:** [docs/design-system.md](docs/design-system.md)
- **Repository:** [github.com/Jayanng/baserate](https://github.com/Jayanng/baserate)

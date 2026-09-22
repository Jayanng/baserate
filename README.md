# BaseRate

**Bitget AI Base Camp Season 2 · Track 3: AI Trading Desk · Sub-theme: Decision Stress Testing**

> Stop guessing. Get the base rate for your trade.

BaseRate is a pre-trade stress desk for rTokens, Bitget's tokenized US stocks that trade 24 hours a day, 7 days a week. A trader describes a trade in plain English. BaseRate finds every time in market history that this exact situation happened, shows what happened next as a full outcome distribution, computes what the trade does to weekend collateral, and lets the trader reshape the trade live. Then, every Monday, BaseRate grades its own past reports against what actually happened and publishes the score.

Dossier, not signal. Computed, not vibes. And a desk that keeps score on itself.

## 1. Hackathon alignment

| Field | Answer |
|---|---|
| Hackathon | Bitget AI Base Camp Season 2 |
| Track | Track 3: AI Trading Desk |
| Sub-theme | Decision Stress Testing |
| Product | Pre-trade stress desk with a self-scoring forecast loop |
| Named user | rToken weekend holders: leveraged tokenized-stock positions held from Friday cash close to Monday reopen |
| Signature capability | Full-history regime matching plus a calibration ledger that grades every issued dossier |
| Human-in-the-loop | The desk researches, computes, and grades itself. The human decides. |
| Rails | Bitget public REST (spot + futures), bitget-mcp-server, public native-market history |
| Access model | Read-only. No API keys. No orders. No account connections. |

### Why this fits Decision Stress Testing

The sub-theme asks for tools that retrieve historically similar scenarios and stress test a decision before it is made. BaseRate does exactly that, deeper than preset shock tables:

- It retrieves historically similar scenarios from decades of market history, not a handful of preset windows.
- It stress tests the exact trade the user is about to place, including Bitget's weekend collateral mechanics.
- It treats every stress report as a registered forecast and verifies it. Stress testing applied to the tool itself.

## 2. The problem

rTokens made US stocks trade 24/7. Risk tooling still sleeps at 4pm New York time.

A trader who holds a leveraged rToken position over the weekend faces a structure most tools never model:

- The UTA margin index for stock tokens is fixed while the native US market is closed. Collateral valuation freezes on Friday.
- Crypto collateral marks and perpetual funding keep moving all weekend. The part of the account that can liquidate the trader stays live while the part that defines the liquidation line is frozen.
- Weekend order books are thin. Slippage assumptions built on weekday tapes are wrong on Saturday night.
- When the cash market reopens on Monday, the reference price for collateral can jump. Weekend gaps land on the trader at reopen.

So the real question before a weekend trade is not "will NVDA go up?" It is: out of every time the market looked like this, what happened next, and what does that do to my collateral on a frozen index with live funding?

No current tool answers that. A report is not a base rate. A base rate without a track record is a guess. BaseRate is the full loop.

## 3. Named user

**The rToken weekend holder.** A crypto-native trader on Bitget who holds tokenized US stocks (rNVDA, rTSLA, rAAPL, and similar names) as leveraged positions from Friday cash close to Monday reopen, funded by USDT or crypto collateral in a unified account. They check the account on Saturday night and no tool tells them their true risk.

Not the target user: people who want an AI to trade for them, long-only cash investors, or execution-algorithm users. BaseRate never executes anything.

## 4. What BaseRate does

The pipeline, end to end:

**Step 1. Plain-English trade intake.** "I want to long rNVDA over the weekend at 3x with 5,000 USDT margin." The desk parses the trade shape: asset, direction, size, leverage, holding window, collateral.

**Step 2. Rules engine: Bitget-native risk math.** Deterministic code, no model in the loop:

- Friday-freeze collateral math: which mark controls collateral while the cash market is closed, and where the liquidation line sits against a frozen index.
- Funding carry: what perpetual funding costs or pays across closed US hours, computed from real funding history.
- Thin-book stress: weekend depth and slippage reality from live order book snapshots.
- Gap exposure: the size of Friday-close-to-Monday-open moves for this asset, from real history.

**Step 3. History engine: the base rate.** Decades of native-market daily history, organized into typed regimes by a deterministic classifier. For the user's exact situation, BaseRate returns the full outcome distribution: out of N historical episodes in this regime, the asset closed down this much X% of the time, gapped through this level Y% of the time, and the worst next-5-day outcome was Z. Every number traceable to dated source data. When history is too thin, the desk refuses: `INSUFFICIENT_EVIDENCE`.

**Step 4. Live counterfactuals.** Drag the size slider. Switch a Friday entry to Monday. Change leverage. Every number recomputes in under a second against the same history, because per-regime outcome tables are precomputed. The trader reshapes the trade until the risk is one they can hold.

**Step 5. The Scorekeeper.** Every dossier is registered as a forecast in an append-only ledger. On Monday, the desk grades itself: did the asset close inside the issued band? Was the collateral stress within the stated worst case? Per-regime accuracy, published miss rates, and band adjustments roll into every future report.

The human reads the dossier and decides. BaseRate never signals, never suggests entries, never touches an order.

## 5. The Scorekeeper: a desk that keeps score

This is the wedge. Stress reports today are typically fire-and-forget: generate, read, close, never revisited. BaseRate closes that loop:

- **Forecast registry.** Every dossier stores its issued bands, regime tag, and a hash chain, so past reports cannot be edited.
- **Monday grading.** Real outcomes are pulled after cash reopen and compared to the issued bands. Hits and misses are both published, side by side, forever.
- **Calibration report.** Per regime: how often issued bands contained reality, Brier-style scores, and which regimes cry wolf.
- **Trust badges in future reports.** "Weekend-drift regime, 11 of 12 accurate." Or the opposite: "this regime has been graded twice, treat these bands as provisional."
- **Band adjustment.** If a regime's bands have been too tight, later dossiers widen them and say so. The adjustment is measured error math done by plain code.

### How BaseRate learns (and the honest limits)

What learns: measured error rates adjust thresholds and band widths per regime. Monday's grade changes Friday's output. That is how real desks calibrate.

What does not learn: no neural network retrains, no hidden re-weighting of history, and the language model never learns numbers. It narrates only. The ledger is append-only, so the desk cannot quietly make its past calls look better. Misses stay on the same screen as hits.

**Replay mode.** A brand-new desk has no grades yet. So BaseRate replays the past: it re-issues what it would have said for the last 30 weekends using only data frozen before each weekend, then scores those against what actually happened. The mechanism, math, and ledger are identical to live grading. Every replayed number is labeled `REPLAY` so nobody mistakes it for a live call. Honesty about replay is part of the product.

## 6. Why this stands out

- Common pattern: historical analogs drawn from a few preset windows or a short lookback with a top-N shortlist. BaseRate matches regimes across decades and shows the whole distribution, not a hand-picked sample.
- Common pattern: static reports, generate once and read once. BaseRate's counterfactuals recompute live, and its reports come back for grading.
- Most desks stop at the report. BaseRate's forecast registry and Monday grading close the loop on the desk's own calls.
- Common pattern: model-generated numbers nobody can reproduce. BaseRate's regime engine is deterministic: same inputs, same regime tags, same distribution, every time. Reproducibility is the trust feature.

| What judges look for | BaseRate's answer |
|---|---|
| Retrieve historically similar scenarios | Full-history regime matching with typed regimes and dated evidence |
| Preset stress tests | Friday-freeze calculator, funding carry, thin-book stress, gap table |
| Feature depth on Bitget rails | Spot tape, UTA collateral rules, futures funding, MCP server |
| Research quality | Calibration math, Brier-style scores, published miss rates, sensitivity shown |
| Human-in-the-loop | Deterministic desk, narrating model, human decides, zero execution |
| Trust | Publishes its own scorecard, misses included |

## 7. Architecture

- **Deterministic core.** Every number is computed by code with pinned inputs. Same inputs, same dossier, every time.
- **Regime classifier.** Deterministic and statistical: fixed, published feature windows bucket historical episodes into typed regimes. Reproducible by any judge with the code.
- **Narration layer.** The language model turns the computed dossier into prose. It receives sanitized summaries only, it never computes, and its output passes a forbidden-output gate that rejects trade signals and fabricated figures.
- **Refusal states.** `INSUFFICIENT_EVIDENCE`, `UNAVAILABLE` (with reason), `REPLAY` (label). The desk would rather refuse than guess.
- **Evidence labels.** Every figure is stamped `observed`, `estimated`, `target`, or `replay`.
- **No fabrication.** If an upstream source fails, the field says UNAVAILABLE. Never interpolated, never invented.
- **Read-only.** No keys, no account connections, no orders, no transfers.

Planned repository layout:

```
baserate/
  README.md
  docs/
    architecture.md
    scorecard-spec.md
    data-provenance.md
  engine/
    rules/       # collateral freeze, funding carry, thin book, gap math
    history/     # regime tables, outcome distributions
    classify/    # deterministic regime classifier
    scorecard/   # grading, calibration, band adjustment
  ledger/
    registry.md  # append-only forecast registry (hash-chained)
  web/
    app/         # demo UI: dossier, counterfactuals, scorecard
  fixtures/
    replay/      # frozen weekends for replay mode
  tests/
```

## 8. Data plan and provenance

| Source | Used for | Status |
|---|---|---|
| Bitget public REST (spot) | rToken tickers, order book depth, daily candles | Verified live. Candles use plain enums (`1day`); `endTime` pagination walks back to each token's listing. |
| Bitget public REST (futures) | Stock perp funding (current + history), perp candles | Verified live. Stock perps trade under plain tickers (NVDAUSDT, TSLAUSDT, QQQUSDT, and similar); futures candles use UTC-style enums. |
| bitget-mcp-server (agent.bitget.com/mcp) | Guide queries, analyst targets, cross-checks | Endpoint live, 67 documented data entries. Cloudflare-blocked from the build VPS as of Sep 22; optional enhancer, not on the critical path. |
| Public native-market daily history | Decades of stock and index history for regime tables | Decided: Yahoo Finance public chart API, keyless. NVDA to 1999 (6,958 daily bars), AAPL to 1980 (11,535), QQQ to 1999. Fallback: Stooq. |
| Bitget published rules pages | Friday-freeze and margin-index behavior | Documented basis for collateral math. |

Every dossier ships its provenance: which source, which timestamp, which endpoint. Numbers without provenance do not ship.

## 9. Rules and safety

What BaseRate will never do:

- Place, cancel, or close orders. Transfer or withdraw funds. Hold keys.
- Output BUY, SELL, LONG, SHORT, or any trade signal or confidence score.
- Fabricate data. Missing input means UNAVAILABLE with a reason, never an interpolation.
- Present replayed grades as live grades.
- Let a language model compute or alter any number.

Human decides. The desk researches, computes, and grades itself. That is the whole job.

## 10. Honest limitations

- rToken spot history begins at each token's Bitget listing (RNVDA: June 2025). Bitget-native layers such as live weekend tape are young; the deep base rates come from native-market history, and every figure is labeled so the two are never confused.
- Stock perp funding history covers roughly the perp listing window (NVDA perp: since June 2026). Where the carry model leans on thin funding data, it is labeled estimated, never invented.
- The calibration loop is demonstrated in replay mode over past weekends, plus any live grades that fit before submission. The mechanism is identical and clearly labeled.
- Regime taxonomies are product settings, not empirical optima. Sensitivity is shown rather than hidden.
- Descriptive, not predictive: past distributions condition expectations. They are not guarantees, and the desk says so in every dossier.

## 11. Build plan (submission closes Sep 27, UTC+8)

- **Day 1 (Sep 22, done):** data probes completed and verified: candle enum families (spot plain, futures UTC-style), funding endpoints mapped via plain-ticker stock perps, history source decided (Yahoo, keyless, multi-decade), external classifier decision closed (deterministic in-house engine; research archived in docs). Dossier schema next.
- **Day 2 (Sep 23):** golden path. rNVDA weekend hold, end-to-end ugly-but-real pipeline.
- **Day 3 (Sep 24):** regime engine batch classification over full history, counterfactual recompute, refusal states, freeze calculator.
- **Day 4 (Sep 25):** UI polish, preset stress buttons, crash-replay fixture, README in judge order, first build-in-public post.
- **Day 5 (Sep 26 to 27):** cold demo rehearsal, replay-mode scorecard generation, final form answers, final post, submit.

## 12. The judge's 60 seconds

1. Type: "long rNVDA over the weekend at 3x, 5,000 USDT margin."
2. Dossier lands: Friday-freeze liquidation line, weekend funding carry, gap table, and the full regime distribution with dates.
3. Drag size from 5,000 to 12,000. Every number recomputes instantly. The liquidation line walks toward the worst-case weekend gap. Drag back.
4. Open the Scorecard: 30 replayed weekends, hit rate per regime, two labeled misses, one adjusted band with its reason.
5. Close on the thesis: every stress report is a claim about the future. BaseRate is the desk that shows its score on Monday.

## 13. Thesis (submission form answer, drafted)

rTokens made US stocks trade 24/7, but every risk tool still sleeps at 4pm New York time. The collateral calculation freezes on Friday while the market that protects the trader keeps moving. BaseRate gives the weekend trader the base rate for their exact trade before they place it: every historical twin, the full outcome distribution, and the collateral math on a frozen index. Then it keeps score on itself every Monday and publishes its own miss rate. A desk that grades itself in public is the trust step agentic trading needs next.

## 14. Submission checklist

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

## 15. Glossary

- **Base rate:** how often something happened across all of history, not a prediction.
- **Regime:** a typed market situation (trend, chop, squeeze, capitulation) used to bucket historical episodes.
- **Dossier:** the computed report BaseRate issues for one trade shape.
- **Forecast registry:** the append-only ledger of issued dossiers used for Monday grading.
- **Calibration:** measured agreement between issued bands and real outcomes, per regime.
- **Replay mode:** re-issuing and grading past dossiers from frozen data, always labeled REPLAY.

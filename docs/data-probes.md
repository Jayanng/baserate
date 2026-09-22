# Bitget + history data probes — verified 2026-09-22

## Bitget public REST (no key, verified)

### Spot (rTokens)
- Tickers: OK. RNVDAUSDT last 226.85.
- Candles: granularity `1day` WORKS (previous session's `1Dutc` failures were the wrong enum family;
  for SPOT candles the plain names are correct). Depth: 200 bars/page = ~10 months;
  `endTime` pagination walks further back (verified 2 pages: 2025-06 onward for RNVDAUSDT ≈ listing date).
  rToken spot history begins at each token's Bitget listing (RNVDA ≈ Jun 2025) — thin for regime stats.
- Symbols: 2,710 spot pairs, 2,150 R-prefixed rTokens (incl. RAAPLUSDT, RNVDAUSDT, RTSLAUSDT).

### Perps (stock futures — THE funding fix)
- Stock perps exist under PLAIN tickERS: NVDAUSDT, TSLAUSDT, AAPLUSDT, MSFTUSDT, GOOGLUSDT,
  METAUSDT, AMZNUSDT, MSTRUSDT, COINUSDT, QQQUSDT, TQQQUSDT, SQQQUSDT (USDT-FUTURES productType).
  Earlier 40034 error was querying RNVDAUSDT; the perp symbol is NVDAUSDT (no R).
- Current funding: `/api/v2/mix/market/current-fund-rate?symbol=NVDAUSDT&productType=USDT-FUTURES` → 200.
  Rate 0.000037, 8h interval, min/max clamp ±0.01.
- Funding history: `/api/v2/mix/market/history-fund-rate?...` → 200. Rows use `fundingTime` (ms) + `fundingRate`.
- Perp candles: `/api/v2/mix/market/candles?symbol=NVDAUSDT&productType=USDT-FUTURES&granularity=1Dutc` → 200.
  For MIX (futures) the *utc-style* enums are correct (spot uses plain names — opposite families, mind the trap).
  NVDA perp history: ~90 days (listed ~Jun 2026).

## Consequence for BaseRate
- Funding carry across weekends: compute from NVDAUSDT perp funding history (real, Bitget-native). VERIFIED.
- Live weekend tape: rToken spot candles + perp candles. VERIFIED.
- Friday-freeze collateral: Bitget rules page (documented) + live marks. VERIFIED.
- Deep history (decades): comes from Yahoo (below), not Bitget. Bitget history depth ≈ token listing date.

## History source — decision: Yahoo chart API (winner)
- Keyless, no rate-limit wall observed, reliable UA-only access.
- NVDA: 6,958 daily bars from 1999-01-22. AAPL: 11,535 bars from 1980-12-12. QQQ: 6,926 bars from 1999-03-10.
- `period1=0&period2=<now>&interval=1d` returns full listing-to-date history.
- Fallback: Stooq (returned 3 lines for the same query — blocked/limited from this VPS; keep as backup, not primary).

## Probe notes
- Bitget candle enum families: SPOT candles = `1day/1W/1M...`; MIX candles = `1Dutc/3Dutc...`.
  Cross-family enums return HTTP 400.
- bitget-mcp-server: Cloudflare error 1010 from this VPS IP as of today (worked earlier in the session).
  Optional enhancer; not on the critical path. Retry later or from a different egress.

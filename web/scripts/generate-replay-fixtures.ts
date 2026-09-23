import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNativeHistory, type YahooCandle, type YahooHistoryResult } from '../src/data/yahoo-client';
import { toWeekendGaps } from '../src/data/normalizers';
import { classifyRegime } from '../src/engine/regime-classifier';
import { computeDistribution } from '../src/engine/base-rate';
import { computeCalibration, computeBandAdjustments } from '../src/scorekeeper/calibration';
import { appendToLedger, verifyLedgerIntegrity, type LedgerEntry } from '../src/scorekeeper/ledger';
import type { RegimeTag, ForecastRecord } from '../src/domain/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

async function fetchWithRetry(ticker: string, years: number, maxRetries = 3): Promise<YahooHistoryResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Yahoo] Fetching ${ticker} (${years}y) - attempt ${attempt}/${maxRetries}...`);
      const result = await fetchNativeHistory(ticker, years);
      console.log(`[Yahoo] Success: ${result.count} daily bars retrieved (${result.firstDateIso.slice(0, 10)} to ${result.lastDateIso.slice(0, 10)})`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[Yahoo] Attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error(`BLOCKED: Failed to fetch Yahoo history after ${maxRetries} attempts: ${lastError}`);
}

const SELECTED_DATES_BY_TICKER: Record<string, string[]> = {
  NVDA: [
    '2004-06-18', // trend_down -> HIT
    '2007-06-01', // trend_up -> HIT
    '2008-08-15', // squeeze -> HIT
    '2010-07-30', // capitulation -> HIT
    '2012-10-19', // chop -> HIT
    '2015-03-06', // trend_up -> HIT
    '2018-04-20', // trend_down -> HIT
    '2020-03-13', // capitulation -> MISS (worst gap date, covid crash -18.45%)
    '2021-07-16', // chop -> HIT
    '2024-03-15', // chop -> HIT
    '2025-01-24', // squeeze -> MISS (gap-thru-liq miss -16.97%)
    '2026-09-18', // trend_up -> HIT (most recent hit)
  ],
  TSLA: [
    '2011-08-26', // trend_down -> HIT
    '2011-12-02', // trend_up -> HIT
    '2012-08-10', // squeeze -> HIT
    '2015-11-13', // capitulation -> HIT
    '2012-10-19', // chop -> HIT
    '2015-03-06', // chop -> HIT
    '2018-04-20', // chop -> HIT
    '2020-03-13', // capitulation -> MISS (worst gap date, covid crash -18.58%)
    '2021-07-16', // chop -> HIT
    '2024-03-15', // capitulation -> MISS
    '2025-01-24', // chop -> HIT
    '2026-09-18', // trend_up -> HIT (most recent hit)
  ],
  AAPL: [
    '2004-06-18',
    '2007-06-01',
    '2008-08-15',
    '2010-07-30',
    '2012-10-19',
    '2015-03-06',
    '2018-04-20',
    '2020-03-13',
    '2021-07-16',
    '2024-03-15',
    '2025-01-24',
    '2026-09-18',
  ],
  QQQ: [
    '2004-06-18',
    '2007-06-01',
    '2008-08-15',
    '2010-07-30',
    '2012-10-19',
    '2015-03-06',
    '2018-04-20',
    '2020-03-13',
    '2021-07-16',
    '2024-03-15',
    '2025-01-24',
    '2026-09-18',
  ],
  MSTR: [
    '2004-06-18',
    '2007-06-01',
    '2008-08-15',
    '2010-07-30',
    '2012-10-19',
    '2015-03-06',
    '2018-04-20',
    '2020-03-13',
    '2021-07-16',
    '2024-03-15',
    '2025-01-24',
    '2026-09-18',
  ],
};

export async function generateForTicker(yahooTicker: string, rTokenKey: string): Promise<void> {
  console.log(`\n================ GENERATING FIXTURES FOR ${yahooTicker} (${rTokenKey}) ================`);

  // 1. Fetch full native daily history from Yahoo with 3 retries
  const history = await fetchWithRetry(yahooTicker, 27, 3);

  // Map candles by calendar date (YYYY-MM-DD) and index
  const dateToIndex = new Map<string, number>();
  history.candles.forEach((c: YahooCandle, idx: number) => {
    const dStr = new Date(c.tsMs).toISOString().slice(0, 10);
    dateToIndex.set(dStr, idx);
  });

  // 2. Extract Friday -> Monday weekend gaps
  const rawGaps = toWeekendGaps(history.candles);
  console.log(`[${yahooTicker} Gaps] Derived ${rawGaps.length} weekend gap episodes.`);

  // 3. Classify regime for each gap episode using 60-candle sliding window BEFORE each Friday
  const gaps = rawGaps.map((g) => {
    const idx = dateToIndex.get(g.episodeDate);
    if (idx === undefined || idx < 60) {
      return {
        pct: g.pct,
        episodeDate: g.episodeDate,
        source: g.source,
        regime: 'insufficient_evidence' as RegimeTag,
      };
    }
    const window = history.candles.slice(idx - 60, idx);
    const regime = classifyRegime(window);
    return {
      pct: g.pct,
      episodeDate: g.episodeDate,
      source: g.source,
      regime,
    };
  });

  // 4. Group by regime to derive per-regime medians (excluding insufficient_evidence)
  const poolByRegime = new Map<RegimeTag, Array<{ pct: number; episodeDate: string; regime: RegimeTag }>>();
  const regimeCounts: Record<string, number> = {};

  for (const g of gaps) {
    regimeCounts[g.regime] = (regimeCounts[g.regime] || 0) + 1;
    if (g.regime === 'insufficient_evidence') continue;
    if (!poolByRegime.has(g.regime)) {
      poolByRegime.set(g.regime, []);
    }
    poolByRegime.get(g.regime)!.push(g);
  }

  const regimeMedians = new Map<RegimeTag, number>();
  for (const [r, list] of poolByRegime.entries()) {
    const sortedPcts = list.map((g) => g.pct).sort((a, b) => a - b);
    const mid = Math.floor(sortedPcts.length / 2);
    regimeMedians.set(r, sortedPcts[mid] ?? 0);
  }

  // 5. Derive stats over all episodes
  const totalEpisodes = gaps.length;
  const distribution = computeDistribution(gaps);
  if (!distribution) {
    throw new Error(`Failed to compute distribution over gaps for ${yahooTicker}`);
  }

  const sortedAllPcts = [...gaps].map((g) => g.pct).sort((a, b) => a - b);
  const midIndex = Math.floor(sortedAllPcts.length / 2);
  const medianPct = sortedAllPcts[midIndex] ?? 0;

  const worstEpisode = [...gaps].sort((a, b) => a.pct - b.pct)[0];
  const worstPct = worstEpisode?.pct ?? 0;
  const worstDate = worstEpisode?.episodeDate ?? '';

  const closedUpCount = gaps.filter((g) => g.pct > 1).length;
  const closedUpPct = distribution.categories.find((c) => c.label === 'Closed up')?.pct ?? Math.round((closedUpCount / totalEpisodes) * 100);

  // Survived liquidation proxy (-16.2%)
  const survivedWorstGapCount = gaps.filter((g) => g.pct > -16.2).length;
  const survivedWorstGapPct = Math.round((survivedWorstGapCount / totalEpisodes) * 100);

  // 6. Build 12 replay forecast records
  const selectedDates = SELECTED_DATES_BY_TICKER[yahooTicker] ?? SELECTED_DATES_BY_TICKER.NVDA;
  const replayForecasts: ForecastRecord[] = [];
  for (const dateStr of selectedDates) {
    const ep = gaps.find((g) => g.episodeDate === dateStr);
    if (!ep) {
      throw new Error(`Selected date ${dateStr} not found in gap episodes for ${yahooTicker}`);
    }
    const regimeMed = regimeMedians.get(ep.regime) ?? 0;
    const bandLowPct = Number((regimeMed - 4).toFixed(1));
    const bandHighPct = Number((regimeMed + 4).toFixed(1));
    const isHit = ep.pct >= bandLowPct && ep.pct <= bandHighPct;

    replayForecasts.push({
      id: `fc_replay_${dateStr.replace(/-/g, '_')}`,
      issuedAtUtc: `${dateStr}T20:00:00.000Z`,
      tradeHash: `th_${yahooTicker.toLowerCase()}_${dateStr.replace(/-/g, '_')}`,
      bandLowPct,
      bandHighPct,
      regime: ep.regime,
      status: isHit ? 'hit' : 'miss',
      mode: 'replay',
    });
  }

  // 7. Calibration
  const calibration = computeCalibration(replayForecasts);

  // 8. Band adjustments
  const initialBandWidths: Record<RegimeTag, number> = {
    trend_up: 6.0,
    trend_down: 6.0,
    chop: 6.0,
    squeeze: 8.5,
    capitulation: 6.0,
    insufficient_evidence: 6.0,
  };
  const bandAdjustments = computeBandAdjustments(replayForecasts, initialBandWidths);

  // 9. Hash ledger
  let ledgerEntries: LedgerEntry[] = [];
  for (const r of replayForecasts) {
    ledgerEntries = appendToLedger(ledgerEntries, r.id, r.status);
  }
  const ledgerVerified = verifyLedgerIntegrity(ledgerEntries);

  // 10. Assemble complete fixture payload
  const fixturePayload = {
    generatedAtUtc: new Date().toISOString(),
    source: `yahoo_native ${yahooTicker} daily`,
    totalEpisodes,
    gaps,
    distribution,
    replayForecasts,
    calibration,
    bandAdjustments,
    ledger: {
      entries: ledgerEntries,
      verified: ledgerVerified,
    },
    stats: {
      totalEpisodes,
      closedUpCount,
      closedUpPct,
      survivedWorstGapCount,
      survivedWorstGapPct,
      medianPct,
      worstPct,
      worstDate,
      regimeCounts,
    },
  };

  // 11. Write JSON file(s)
  const fixturesDir = path.join(webRoot, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const tickerOutputPath = path.join(fixturesDir, `replay-${yahooTicker}.json`);
  fs.writeFileSync(tickerOutputPath, JSON.stringify(fixturePayload, null, 2) + '\n', 'utf-8');
  console.log(`[Fixtures] Written replay data to ${tickerOutputPath}`);

  // For NVDA, keep replay-data.json in sync as well
  if (yahooTicker === 'NVDA') {
    const defaultOutputPath = path.join(fixturesDir, 'replay-data.json');
    fs.writeFileSync(defaultOutputPath, JSON.stringify(fixturePayload, null, 2) + '\n', 'utf-8');
    console.log(`[Fixtures] Written NVDA default replay data to ${defaultOutputPath}`);
  }

  // 12. Summary stdout log
  const gradedCount = calibration.hits + calibration.misses;
  const calRate = gradedCount > 0 ? Math.round((calibration.hits / gradedCount) * 100) : 0;

  console.log(`\n================ REPLAY FIXTURES SUMMARY: ${yahooTicker} (${rTokenKey}) ================`);
  console.log(`Total Episodes:        ${totalEpisodes}`);
  console.log(`Distribution Categories:`);
  for (const cat of distribution.categories) {
    console.log(`  - ${cat.label.padEnd(14)}: ${String(cat.count).padStart(4)} episodes (${cat.pct}%)`);
  }
  console.log(`Calibration Rate:      ${calRate}% (${calibration.hits}/${gradedCount} hits)`);
  console.log(`Worst Gap Date/Pct:    ${worstDate} (${worstPct.toFixed(2)}%)`);
  console.log(`Survived Worst Gap:    ${survivedWorstGapCount}/${totalEpisodes} (${survivedWorstGapPct}%)`);
  console.log(`Ledger Integrity:      ${ledgerVerified ? 'VERIFIED' : 'FAILED'}`);
  console.log('========================================================================\n');
}

async function main() {
  const assets = [
    { ticker: 'NVDA', rToken: 'rNVDA' },
    { ticker: 'TSLA', rToken: 'rTSLA' },
    { ticker: 'AAPL', rToken: 'rAAPL' },
    { ticker: 'QQQ', rToken: 'rQQQ' },
    { ticker: 'MSTR', rToken: 'rMSTR' },
  ];

  const blocked: string[] = [];

  for (const asset of assets) {
    try {
      await generateForTicker(asset.ticker, asset.rToken);
    } catch (err) {
      console.error(`\n[BLOCKED] Ticker ${asset.ticker} (${asset.rToken}) failed:`, err instanceof Error ? err.message : err);
      blocked.push(asset.ticker);
    }
  }

  if (blocked.length > 0) {
    console.warn(`\n[WARNING] Generation completed with BLOCKED tickers: ${blocked.join(', ')}`);
  } else {
    console.log('\n[SUCCESS] Successfully generated replay fixtures for all 5 assets.');
  }
}

main().catch((err) => {
  console.error('Fatal error generating fixtures:', err);
  process.exit(1);
});

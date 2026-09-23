import { describe, it, expect } from 'vitest';
import {
  getReplayData,
  getReplayGaps,
  getReplayDistribution,
  getReplayForecasts,
  getReplayCalibration,
  getReplayLedger,
  getReplayStats,
  REPLAY_META,
  type ReplayAsset,
} from '@/src/data/replay-fixtures';
import { gradeForecast } from '@/src/scorekeeper/grader';
import { verifyLedgerIntegrity } from '@/src/scorekeeper/ledger';
import { computeDistribution } from '@/src/engine/base-rate';
import {
  computeLiquidationDistance,
  computeFundingCarry,
  computeWorstGap,
} from '@/src/engine/risk-engine';
import {
  FIXTURE_SPOT_PRICE,
  FIXTURE_FUNDING_RATE,
  getFixtureBundle,
} from '@/components/dossier/fixtures';

describe('BaseRate Phase 10 Replay Fixtures & Invariants (NVDA Desk-Reference)', () => {
  it('fixture JSON parses and matches domain types', () => {
    expect(REPLAY_META.source).toBe('yahoo_native NVDA daily');
    expect(Date.parse(REPLAY_META.generatedAtUtc)).not.toBeNaN();

    const gaps = getReplayGaps();
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps.length).toBeGreaterThan(0);

    const firstGap = gaps[0];
    expect(firstGap).toBeDefined();
    expect(typeof firstGap?.pct).toBe('number');
    expect(typeof firstGap?.episodeDate).toBe('string');
    expect(firstGap?.source).toBe('yahoo_native');
    expect(typeof firstGap?.regime).toBe('string');

    const dist = getReplayDistribution();
    expect(dist).toBeDefined();
    expect(dist.sampleSize).toBe(gaps.length);
    expect(Array.isArray(dist.categories)).toBe(true);

    const forecasts = getReplayForecasts();
    expect(Array.isArray(forecasts)).toBe(true);
    expect(forecasts.length).toBe(12);

    const cal = getReplayCalibration();
    expect(cal).toBeDefined();
    expect(typeof cal.total).toBe('number');

    const ledger = getReplayLedger();
    expect(ledger).toBeDefined();
    expect(Array.isArray(ledger.entries)).toBe(true);

    const stats = getReplayStats();
    expect(stats).toBeDefined();
    expect(stats.totalEpisodes).toBe(gaps.length);
  });

  it('totalEpisodes matches gaps.length', () => {
    const gaps = getReplayGaps();
    const stats = getReplayStats();

    expect(stats.totalEpisodes).toBe(gaps.length);
    expect(gaps.length).toBeGreaterThan(1000);
  });

  it('distribution counts sum to totalEpisodes, pcts sum to 100', () => {
    const dist = getReplayDistribution();
    const stats = getReplayStats();

    expect(dist.sampleSize).toBe(stats.totalEpisodes);

    const countSum = dist.categories.reduce((acc, c) => acc + c.count, 0);
    expect(countSum).toBe(stats.totalEpisodes);

    const pctSum = dist.categories.reduce((acc, c) => acc + c.pct, 0);
    expect(pctSum).toBe(100);
  });

  it('every forecast status is hit|miss (no pending in replay set) and band contains-or-excludes actual consistently with grader logic', () => {
    const forecasts = getReplayForecasts();
    const gaps = getReplayGaps();

    expect(forecasts.length).toBe(12);

    for (const record of forecasts) {
      expect(['hit', 'miss']).toContain(record.status);
      expect(record.mode).toBe('replay');

      const dateStr = record.issuedAtUtc.slice(0, 10);
      const episode = gaps.find((g) => g.episodeDate === dateStr);
      expect(episode).toBeDefined();

      if (episode) {
        const graded = gradeForecast(record, episode.pct);
        expect(graded.status).toBe(record.status);
      }
    }
  });

  it('calibration totals match record counts', () => {
    const forecasts = getReplayForecasts();
    const cal = getReplayCalibration();

    expect(cal.total).toBe(forecasts.length);

    const hits = forecasts.filter((f) => f.status === 'hit').length;
    const misses = forecasts.filter((f) => f.status === 'miss').length;
    const pending = forecasts.filter((f) => f.status === 'pending').length;

    expect(cal.hits).toBe(hits);
    expect(cal.misses).toBe(misses);
    expect(cal.pending).toBe(0);
    expect(pending).toBe(0);

    const regimeTotal = cal.byRegime.reduce((acc, r) => acc + r.total, 0);
    expect(regimeTotal).toBe(forecasts.length);

    const regimeHits = cal.byRegime.reduce((acc, r) => acc + r.hits, 0);
    expect(regimeHits).toBe(hits);
  });

  it('verifyLedgerIntegrity(ledger.entries) === true', () => {
    const ledger = getReplayLedger();
    const forecasts = getReplayForecasts();

    expect(ledger.verified).toBe(true);
    expect(ledger.entries.length).toBe(forecasts.length);
    expect(verifyLedgerIntegrity(ledger.entries)).toBe(true);

    expect(ledger.entries[0]?.previousHash).toBe('GENESIS');
  });

  it('re-run computeDistribution on gaps and expect it to deep-equal the stored distribution (determinism check)', () => {
    const gaps = getReplayGaps();
    const storedDist = getReplayDistribution();
    const recomputed = computeDistribution(gaps);

    expect(recomputed).toEqual(storedDist);
  });
});

describe('Phase 10.7 Multi-Asset Fixtures Invariants', () => {
  const ALL_ASSETS: ReplayAsset[] = ['rNVDA', 'rTSLA', 'rAAPL', 'rQQQ', 'rMSTR'];

  it.each(ALL_ASSETS)('asset %s parses, has >500 episodes, and counts match gaps.length', (asset) => {
    const data = getReplayData(asset);
    expect(data).toBeDefined();
    expect(data.totalEpisodes).toBeGreaterThan(500);
    expect(data.gaps.length).toBe(data.totalEpisodes);
    expect(data.stats.totalEpisodes).toBe(data.totalEpisodes);
    expect(data.distribution.sampleSize).toBe(data.totalEpisodes);
  });

  it.each(ALL_ASSETS)('asset %s distribution categories sum count to totalEpisodes and pct to 100', (asset) => {
    const data = getReplayData(asset);
    const countSum = data.distribution.categories.reduce((acc, c) => acc + c.count, 0);
    expect(countSum).toBe(data.totalEpisodes);

    const pctSum = data.distribution.categories.reduce((acc, c) => acc + c.pct, 0);
    expect(pctSum).toBe(100);
  });

  it.each(ALL_ASSETS)('asset %s ledger is cryptographically verified with 12 forecast entries chained from GENESIS', (asset) => {
    const data = getReplayData(asset);
    expect(data.replayForecasts.length).toBe(12);
    expect(data.ledger.entries.length).toBe(12);
    expect(data.ledger.verified).toBe(true);
    expect(data.ledger.entries[0]?.previousHash).toBe('GENESIS');
    expect(verifyLedgerIntegrity(data.ledger.entries)).toBe(true);
  });

  it.each(ALL_ASSETS)('asset %s forecasts are hit|miss and consistent with grader recomputation', (asset) => {
    const data = getReplayData(asset);
    for (const record of data.replayForecasts) {
      expect(['hit', 'miss']).toContain(record.status);
      expect(record.mode).toBe('replay');

      const dateStr = record.issuedAtUtc.slice(0, 10);
      const episode = data.gaps.find((g) => g.episodeDate === dateStr);
      expect(episode).toBeDefined();

      if (episode) {
        const graded = gradeForecast(record, episode.pct);
        expect(graded.status).toBe(record.status);
      }
    }
  });

  it.each(ALL_ASSETS)('asset %s calibration is consistent with forecast records', (asset) => {
    const data = getReplayData(asset);
    const cal = data.calibration;
    expect(cal.total).toBe(12);
    expect(cal.hits + cal.misses).toBe(12);
    expect(cal.pending).toBe(0);

    const hits = data.replayForecasts.filter((f) => f.status === 'hit').length;
    const misses = data.replayForecasts.filter((f) => f.status === 'miss').length;
    expect(cal.hits).toBe(hits);
    expect(cal.misses).toBe(misses);
  });

  it.each(ALL_ASSETS)('asset %s determinism: recomputing computeDistribution deep-equals stored distribution', (asset) => {
    const data = getReplayData(asset);
    const recomputed = computeDistribution(data.gaps);
    expect(recomputed).toEqual(data.distribution);
  });

  it('getReplayData("rTSLA") returns TSLA source string naming the ticker', () => {
    const tslaData = getReplayData('rTSLA');
    expect(tslaData.source).toContain('TSLA');
    expect(tslaData.source).toBe('yahoo_native TSLA daily');
  });

  it('dossier fixture bundle returns different distributions and episode counts for rNVDA vs rTSLA', () => {
    const nvdaBundle = getFixtureBundle('rNVDA');
    const tslaBundle = getFixtureBundle('rTSLA');

    // Prove they are actually different datasets
    expect(nvdaBundle.stats.totalEpisodes).not.toBe(tslaBundle.stats.totalEpisodes);
    expect(nvdaBundle.distribution.sampleSize).not.toBe(tslaBundle.distribution.sampleSize);
    expect(nvdaBundle.distribution).not.toEqual(tslaBundle.distribution);

    // NVDA has 1227 episodes, TSLA has 736
    expect(nvdaBundle.stats.totalEpisodes).toBe(1227);
    expect(tslaBundle.stats.totalEpisodes).toBe(736);

    // Distribution category differences
    const nvdaUp = nvdaBundle.distribution.categories.find((c) => c.label === 'Closed up')?.pct;
    const tslaUp = tslaBundle.distribution.categories.find((c) => c.label === 'Closed up')?.pct;
    expect(nvdaUp).toBe(38);
    expect(tslaUp).toBe(43);
    expect(nvdaUp).not.toBe(tslaUp);
  });
});

describe('overview tile consistency', () => {
  it('overview-computed liquidation equals computeLiquidationDistance(FIXTURE_SPOT_PRICE, 3, "long") to 1dp (-32.8%)', () => {
    const liqDist = computeLiquidationDistance(FIXTURE_SPOT_PRICE, 3, 'long');
    expect(Number(liqDist.toFixed(1))).toBe(-32.8);
  });

  it('overview funding carry matches computeFundingCarry(FIXTURE_FUNDING_RATE, 60) to 2dp (+0.16%)', () => {
    const carry = computeFundingCarry(FIXTURE_FUNDING_RATE, 60);
    expect(Number(carry.toFixed(2))).toBe(0.16);
  });

  it('overview worst gap matches computeWorstGap(getReplayGaps()) to 1dp (-18.5%) and date matches stats.worstDate', () => {
    const gaps = getReplayGaps();
    const stats = getReplayStats();
    const worst = computeWorstGap(gaps);

    expect(worst).not.toBeNull();
    expect(Number(worst?.toFixed(1))).toBe(-18.5);
    expect(stats.worstDate).toBe('2020-03-13');
  });

  it('overview survival count and total match getReplayStats() exactly', () => {
    const stats = getReplayStats();
    expect(stats.survivedWorstGapCount).toBe(1225);
    expect(stats.totalEpisodes).toBe(1227);
    expect(stats.survivedWorstGapPct).toBe(100);
  });
});

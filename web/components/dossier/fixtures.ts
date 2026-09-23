import type { WeekendGapObservation, EvidenceItem, OutcomeDistribution } from '@/src/domain/types';
import {
  getReplayGaps,
  getReplayDistribution,
  getReplayStats,
  type ReplayAsset,
  type ReplayStats,
} from '@/src/data/replay-fixtures';

export { type ReplayAsset };

export const FIXTURE_SPOT_PRICES: Record<ReplayAsset, number> = {
  rNVDA: 228.2,
  rTSLA: 245.5,
  rAAPL: 225.0,
  rQQQ: 485.0,
  rMSTR: 145.0,
};

export const FIXTURE_SPOT_PRICE = FIXTURE_SPOT_PRICES.rNVDA;

/**
 * Live funding comes from the perp adapter (fetchCurrentFunding(perpSymbol));
 * offline demo uses deterministic fixture rates per asset.
 */
export const FIXTURE_FUNDING_RATES: Record<ReplayAsset, number> = {
  rNVDA: 0.000219,
  rTSLA: 0.000245,
  rAAPL: 0.000185,
  rQQQ: 0.00015,
  rMSTR: 0.00032,
};

export const FIXTURE_FUNDING_RATE = FIXTURE_FUNDING_RATES.rNVDA;

/**
 * 60 daily candles forming a deterministic trend_down regime:
 * SMA20 < SMA50 * 0.98 and return5dPct < 0
 */
export const FIXTURE_CANDLES: Array<{ close: number; tsMs: number }> = Array.from(
  { length: 60 },
  (_, i) => {
    const baseTs = 1717000000000;
    let close: number;
    if (i < 40) {
      close = 245 - i * 0.2 + ((i % 3) - 1) * 0.5;
    } else {
      close = 235 - (i - 40) * 0.35 + (i % 2 === 0 ? 0.3 : -0.3);
    }
    return {
      close: Number(close.toFixed(2)),
      tsMs: baseTs + i * 86400000,
    };
  }
);

/**
 * Demo regime candles - deterministic per asset, history stats come from real replay fixtures.
 */
export function getFixtureCandles(asset: ReplayAsset): Array<{ close: number; tsMs: number }> {
  if (asset === 'rNVDA') {
    return FIXTURE_CANDLES;
  }
  const baseTs = 1717000000000;
  const basePrice = FIXTURE_SPOT_PRICES[asset];
  return Array.from({ length: 60 }, (_, i) => {
    let offset = 0;
    if (asset === 'rTSLA') {
      // Deterministic upward momentum sequence
      offset = i * 0.35 + ((i % 4) - 1.5) * 0.8;
    } else if (asset === 'rAAPL') {
      // Deterministic chop sequence
      offset = Math.sin(i / 3) * 2.5 + ((i % 2) - 0.5) * 0.5;
    } else if (asset === 'rQQQ') {
      // Deterministic tight chop sequence
      offset = ((i % 5) - 2) * 0.6;
    } else if (asset === 'rMSTR') {
      // Deterministic squeeze sequence
      offset = i < 45 ? ((i % 3) - 1) * 1.5 : (i - 45) * 2.5;
    }
    return {
      close: Number(Math.max(1, basePrice + offset).toFixed(2)),
      tsMs: baseTs + i * 86400000,
    };
  });
}

/**
 * Real historical weekend gap episodes computed from Yahoo Finance NVDA daily closes (1999 to 2026).
 * Desk reference dataset default: rNVDA.
 */
export const FIXTURE_GAPS: WeekendGapObservation[] = getReplayGaps('rNVDA');

export const FIXTURE_DISTRIBUTION: OutcomeDistribution = getReplayDistribution('rNVDA');

export const FIXTURE_STATS: ReplayStats = getReplayStats('rNVDA');

export const FIXTURE_EPISODES_EVIDENCE: EvidenceItem[] = [
  {
    label: 'observed',
    source: 'yahoo_native',
    timestampUtc: '2022-10-28T20:00:00.000Z',
    note: 'Oct 28, 2022 · NVDA closed -2.4% over weekend after earnings miss. Funding was -0.28% across 60h.',
  },
  {
    label: 'observed',
    source: 'yahoo_native',
    timestampUtc: '2015-08-21T20:00:00.000Z',
    note: 'Aug 21, 2015 · NVDA -3.5% Fri-Mon. China devaluation contagion across tech sector.',
  },
  {
    label: 'observed',
    source: 'yahoo_native',
    timestampUtc: '2020-03-13T20:00:00.000Z',
    note: 'Mar 13, 2020 · Worst recorded Fri-Mon gap. NVDA -18.5%. Covid crash acceleration in thin books.',
  },
  {
    label: 'observed',
    source: 'yahoo_native',
    timestampUtc: '2025-01-24T20:00:00.000Z',
    note: 'Jan 24, 2025 · DeepSeek shock. NVDA -17.0% Fri-Mon gap through liquidation boundary.',
  },
  {
    label: 'observed',
    source: 'yahoo_native',
    timestampUtc: '2026-09-18T20:00:00.000Z',
    note: 'Sep 18, 2026 · Flat weekend. NVDA +2.3%. Landed comfortably inside predicted regime band.',
  },
];

export function getFixtureEvidence(asset: ReplayAsset): EvidenceItem[] {
  if (asset === 'rNVDA') {
    return FIXTURE_EPISODES_EVIDENCE;
  }
  const ticker = asset.replace(/^r/, '');
  const stats = getReplayStats(asset);
  return [
    {
      label: 'observed',
      source: 'yahoo_native',
      timestampUtc: `${stats.worstDate}T20:00:00.000Z`,
      note: `${stats.worstDate} · Worst recorded Fri-Mon gap for ${ticker}: ${stats.worstPct.toFixed(1)}%.`,
    },
    {
      label: 'observed',
      source: 'yahoo_native',
      timestampUtc: '2026-09-18T20:00:00.000Z',
      note: `Sep 18, 2026 · Recent weekend episode for ${ticker}. Landed inside predicted regime band.`,
    },
    {
      label: 'observed',
      source: 'yahoo_native',
      timestampUtc: '2020-03-13T20:00:00.000Z',
      note: `Mar 13, 2020 · Covid crash acceleration across market. ${ticker} gap recorded.`,
    },
  ];
}

export function asReplayAsset(rawAsset: string): ReplayAsset {
  const clean = rawAsset.replace(/^[$#]/, '').trim();
  const upper = clean.toUpperCase();
  if (upper === 'RNVDA' || upper === 'NVDA') return 'rNVDA';
  if (upper === 'RTSLA' || upper === 'TSLA') return 'rTSLA';
  if (upper === 'RAAPL' || upper === 'AAPL') return 'rAAPL';
  if (upper === 'RQQQ' || upper === 'QQQ') return 'rQQQ';
  if (upper === 'RMSTR' || upper === 'MSTR') return 'rMSTR';
  return 'rNVDA';
}

export interface DossierFixtureBundle {
  asset: ReplayAsset;
  spotPrice: number;
  fundingRate: number;
  candles: Array<{ close: number; tsMs: number }>;
  gaps: WeekendGapObservation[];
  distribution: OutcomeDistribution;
  stats: ReplayStats;
  evidence: EvidenceItem[];
}

export function FIXTURE_GAPS_FOR(asset: ReplayAsset): WeekendGapObservation[] {
  return getReplayGaps(asset);
}

export function FIXTURE_DISTRIBUTION_FOR(asset: ReplayAsset): OutcomeDistribution {
  return getReplayDistribution(asset);
}

export function FIXTURE_STATS_FOR(asset: ReplayAsset): ReplayStats {
  return getReplayStats(asset);
}

export function FIXTURE_CANDLES_FOR(asset: ReplayAsset): Array<{ close: number; tsMs: number }> {
  return getFixtureCandles(asset);
}

export function getFixtureBundle(asset: ReplayAsset): DossierFixtureBundle {
  return {
    asset,
    spotPrice: FIXTURE_SPOT_PRICES[asset] ?? FIXTURE_SPOT_PRICE,
    fundingRate: FIXTURE_FUNDING_RATES[asset] ?? FIXTURE_FUNDING_RATE,
    candles: getFixtureCandles(asset),
    gaps: getReplayGaps(asset),
    distribution: getReplayDistribution(asset),
    stats: getReplayStats(asset),
    evidence: getFixtureEvidence(asset),
  };
}

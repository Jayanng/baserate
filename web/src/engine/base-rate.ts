/**
 * BaseRate Historical Base-Rate Engine
 * Statistical retrieval and outcome distribution calculation for weekend gap episodes.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Percentages sum to exactly 100 with remainder allocated to the largest bucket
 */

import {
  type RegimeTag,
  type OutcomeDistribution,
  type DistributionCategory,
} from '../domain/types';

export const MIN_EPISODES_FOR_DISTRIBUTION = 5;
export const MIN_REGIME_COMPARABLE_MATCHES = 10;

export interface EpisodeInput {
  pct: number;
  episodeDate?: string;
}

export interface RegimeEpisodeInput extends EpisodeInput {
  episodeDate: string;
  regime: RegimeTag;
}

/**
 * Filters comparable historical gap episodes by matching regime.
 * If fewer than 10 matches are found, falls back to all gaps regardless of regime.
 */
export function findComparableEpisodes(
  gaps: Array<{ pct: number; episodeDate: string }>,
  regime: RegimeTag,
  allGaps?: Array<{ pct: number; episodeDate: string; regime: RegimeTag }>
): Array<{ pct: number; episodeDate: string }> {
  const pool = allGaps ?? [];
  const matched = pool.filter((g) => g.regime === regime);

  if (matched.length >= MIN_REGIME_COMPARABLE_MATCHES) {
    return matched.map((g) => ({ pct: g.pct, episodeDate: g.episodeDate }));
  }

  if (pool.length > 0) {
    return pool.map((g) => ({ pct: g.pct, episodeDate: g.episodeDate }));
  }

  return gaps.map((g) => ({ pct: g.pct, episodeDate: g.episodeDate }));
}

/**
 * Computes deterministic outcome distribution across 5 risk categories.
 *
 * Categories:
 * - 'Closed up'   (pct > 1)
 * - 'Flat'        (-1 <= pct <= 1)
 * - 'Down 1-5%'   (-5 < pct < -1)
 * - 'Down >5%'    (-15 < pct <= -5)
 * - 'Gap thru liq' (pct <= -15)
 *
 * Constraints:
 * - Returns null if episodes.length < 5
 * - Percentages must sum to exactly 100 (Math.round with largest bucket absorbing remainder)
 */
export function computeDistribution(
  episodes: Array<{ pct: number; episodeDate?: string }>
): OutcomeDistribution | null {
  if (!episodes || episodes.length < MIN_EPISODES_FOR_DISTRIBUTION) {
    return null;
  }

  const total = episodes.length;

  let closedUpCount = 0;
  let flatCount = 0;
  let down1to5Count = 0;
  let downOver5Count = 0;
  let gapThruLiqCount = 0;

  for (const ep of episodes) {
    const p = ep.pct;
    if (p <= -15) {
      gapThruLiqCount++;
    } else if (p <= -5) {
      downOver5Count++;
    } else if (p < -1) {
      down1to5Count++;
    } else if (p <= 1) {
      flatCount++;
    } else {
      closedUpCount++;
    }
  }

  const categories: DistributionCategory[] = [
    { label: 'Closed up', count: closedUpCount, pct: 0 },
    { label: 'Flat', count: flatCount, pct: 0 },
    { label: 'Down 1-5%', count: down1to5Count, pct: 0 },
    { label: 'Down >5%', count: downOver5Count, pct: 0 },
    { label: 'Gap thru liq', count: gapThruLiqCount, pct: 0 },
  ];

  let sumPct = 0;
  for (const cat of categories) {
    cat.pct = Math.round((cat.count / total) * 100);
    sumPct += cat.pct;
  }

  // Adjust largest bucket by remainder so sum equals exactly 100
  const remainder = 100 - sumPct;
  let largestCat = categories[0];
  if (largestCat) {
    for (const cat of categories) {
      if (cat.count > largestCat.count) {
        largestCat = cat;
      }
    }
    largestCat.pct += remainder;
  }

  // Median and worst calculation
  const sorted = [...episodes].sort((a, b) => a.pct - b.pct);
  const midIndex = Math.floor(sorted.length / 2);
  const medianItem = sorted[midIndex];
  const medianNext5dPct = medianItem !== undefined ? medianItem.pct : null;

  const worstItem = sorted[0];
  const worstNext5dPct = worstItem !== undefined ? worstItem.pct : null;
  const worstEpisodeDate = worstItem?.episodeDate ?? null;

  return {
    sampleSize: total,
    categories,
    medianNext5dPct,
    worstNext5dPct,
    worstEpisodeDate,
  };
}

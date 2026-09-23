/**
 * BaseRate Depth Stress Engine
 * Deterministic public order-book depth stress calculations.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Fail-closed on invalid inputs, empty books, or non-finite numbers
 * - Explicit sign conventions for estimated VWAP and execution slippage
 */

export interface DepthLevel {
  price: number;
  size: number;
}

export interface DepthStressResult {
  state: 'ok' | 'insufficient_depth' | 'unavailable';
  observedAtUtc: string | null;
  side: 'buy' | 'sell';
  requestedNotionalUsdt: number;
  coveredNotionalUsdt: number | null;
  levelsConsumed: number | null;
  estimatedVwapPct: number | null;
  slippagePct: number | null;
  reason: string | null;
}

export interface ComputeDepthStressParams {
  levels: DepthLevel[];
  side: 'buy' | 'sell';
  requestedNotionalUsdt: number;
  referencePrice: number;
  observedAtUtc?: string | null;
}

/**
 * Computes depth stress against order-book levels.
 *
 * Sign conventions:
 * - estimatedVwapPct is signed relative to referencePrice: ((vwap - ref) / ref) * 100.
 *   - Buys: VWAP >= referencePrice => estimatedVwapPct >= 0 (paying above reference).
 *   - Sells: VWAP <= referencePrice => estimatedVwapPct <= 0 (receiving below reference).
 * - slippagePct represents execution penalty / cost as a positive percentage:
 *   - Buys: slippagePct = estimatedVwapPct (vwap above reference = positive cost).
 *   - Sells: slippagePct = ((referencePrice - vwap) / referencePrice) * 100 (vwap below reference = positive cost).
 *
 * Fail-closed:
 * Returns state 'unavailable' with reason on empty book, non-finite or non-positive
 * price/size, zero/negative requested notional, or non-finite referencePrice.
 * Returns state 'insufficient_depth' when requested notional exceeds book depth.
 */
export function computeDepthStress(
  params: ComputeDepthStressParams
): DepthStressResult {
  const observedAtUtc = params?.observedAtUtc ?? null;
  const side = params?.side;

  if (side !== 'buy' && side !== 'sell') {
    return {
      state: 'unavailable',
      observedAtUtc,
      side: 'buy',
      requestedNotionalUsdt: params?.requestedNotionalUsdt ?? 0,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Invalid side: must be buy or sell',
    };
  }

  const requestedNotionalUsdt = params?.requestedNotionalUsdt;
  if (
    typeof requestedNotionalUsdt !== 'number' ||
    !Number.isFinite(requestedNotionalUsdt) ||
    requestedNotionalUsdt <= 0
  ) {
    return {
      state: 'unavailable',
      observedAtUtc,
      side,
      requestedNotionalUsdt:
        typeof requestedNotionalUsdt === 'number' && Number.isFinite(requestedNotionalUsdt)
          ? requestedNotionalUsdt
          : 0,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Requested notional must be a positive finite number',
    };
  }

  const referencePrice = params?.referencePrice;
  if (
    typeof referencePrice !== 'number' ||
    !Number.isFinite(referencePrice) ||
    referencePrice <= 0
  ) {
    return {
      state: 'unavailable',
      observedAtUtc,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Reference price must be a positive finite number',
    };
  }

  const levels = params?.levels;
  if (!levels || !Array.isArray(levels) || levels.length === 0) {
    return {
      state: 'unavailable',
      observedAtUtc,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Order book levels array is empty',
    };
  }

  // Validate each level for positive finite numeric price and size
  for (const lvl of levels) {
    if (
      !lvl ||
      typeof lvl.price !== 'number' ||
      typeof lvl.size !== 'number' ||
      !Number.isFinite(lvl.price) ||
      !Number.isFinite(lvl.size) ||
      lvl.price <= 0 ||
      lvl.size <= 0
    ) {
      return {
        state: 'unavailable',
        observedAtUtc,
        side,
        requestedNotionalUsdt,
        coveredNotionalUsdt: null,
        levelsConsumed: null,
        estimatedVwapPct: null,
        slippagePct: null,
        reason: 'Invalid or non-positive level price/size in order book',
      };
    }
  }

  // Walk in order book order: asks ascending for buy, bids descending for sell
  const sortedLevels = [...levels].sort((a, b) =>
    side === 'buy' ? a.price - b.price : b.price - a.price
  );

  let remainingNotional = requestedNotionalUsdt;
  let totalBaseSize = 0;
  let coveredNotional = 0;
  let levelsConsumed = 0;

  for (const level of sortedLevels) {
    if (remainingNotional <= 0) {
      break;
    }

    const levelNotional = level.price * level.size;
    levelsConsumed += 1;

    if (remainingNotional <= levelNotional) {
      const partialBaseSize = remainingNotional / level.price;
      totalBaseSize += partialBaseSize;
      coveredNotional += remainingNotional;
      remainingNotional = 0;
      break;
    } else {
      totalBaseSize += level.size;
      coveredNotional += levelNotional;
      remainingNotional -= levelNotional;
    }
  }

  // Floating point threshold check: if still missing notional beyond epsilon
  if (remainingNotional > 1e-8) {
    return {
      state: 'insufficient_depth',
      observedAtUtc,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: coveredNotional,
      levelsConsumed,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Requested notional exceeds total available order-book depth',
    };
  }

  if (totalBaseSize <= 0) {
    return {
      state: 'unavailable',
      observedAtUtc,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Total base size accumulated is non-positive',
    };
  }

  const vwap = requestedNotionalUsdt / totalBaseSize;
  const estimatedVwapPct = ((vwap - referencePrice) / referencePrice) * 100;
  const slippagePct =
    side === 'buy'
      ? estimatedVwapPct
      : ((referencePrice - vwap) / referencePrice) * 100;

  return {
    state: 'ok',
    observedAtUtc,
    side,
    requestedNotionalUsdt,
    coveredNotionalUsdt: requestedNotionalUsdt,
    levelsConsumed,
    estimatedVwapPct,
    slippagePct,
    reason: null,
  };
}

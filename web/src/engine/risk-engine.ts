/**
 * BaseRate Risk Engine
 * Deterministic risk calculations for Bitget rToken positions.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Fail-closed on invalid inputs
 */

export const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5% maintenance margin buffer

/**
 * Computes the percentage distance from entry price to estimated liquidation price.
 *
 * Formulas:
 * - Long:  liq = entryPrice * (1 - 1/leverage + 0.005)
 * - Short: liq = entryPrice * (1 + 1/leverage - 0.005)
 * - Distance % = ((liq - entryPrice) / entryPrice) * 100
 *
 * Fail-closed:
 * Throws Error('Invalid inputs') if leverage <= 1, entryPrice <= 0, or inputs non-finite.
 */
export function computeLiquidationDistance(
  entryPrice: number,
  leverage: number,
  direction: 'long' | 'short'
): number {
  if (
    typeof entryPrice !== 'number' ||
    typeof leverage !== 'number' ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(leverage) ||
    entryPrice <= 0 ||
    leverage <= 1 ||
    (direction !== 'long' && direction !== 'short')
  ) {
    throw new Error('Invalid inputs');
  }

  let liqPrice: number;
  if (direction === 'long') {
    liqPrice = entryPrice * (1 - 1 / leverage + MAINTENANCE_MARGIN_RATE);
  } else {
    liqPrice = entryPrice * (1 + 1 / leverage - MAINTENANCE_MARGIN_RATE);
  }

  return ((liqPrice - entryPrice) / entryPrice) * 100;
}

/**
 * Computes funding carry percentage across a given holding window.
 *
 * Formulas:
 * - intervals = holdingHours / 8
 * - carry = fundingRatePerInterval * intervals * 100 (as percentage)
 * - Returns carry percentage
 */
export function computeFundingCarry(
  fundingRatePerInterval: number,
  holdingHours: number
): number {
  if (
    typeof fundingRatePerInterval !== 'number' ||
    typeof holdingHours !== 'number' ||
    !Number.isFinite(fundingRatePerInterval) ||
    !Number.isFinite(holdingHours) ||
    holdingHours < 0
  ) {
    throw new Error('Invalid inputs');
  }

  const intervals = holdingHours / 8;
  const carry = fundingRatePerInterval * intervals * 100;
  return carry;
}

/**
 * Computes the worst (most negative) gap from an array of gap observations.
 *
 * Algorithm:
 * - Sort by pct ascending (most negative first)
 * - Return gaps[0]?.pct ?? null
 * - If empty array, return null
 */
export function computeWorstGap(
  gaps: Array<{ pct: number }>
): number | null {
  if (!gaps || gaps.length === 0) {
    return null;
  }

  const sorted = [...gaps].sort((a, b) => a.pct - b.pct);
  const worst = sorted[0];
  return worst !== undefined ? worst.pct : null;
}

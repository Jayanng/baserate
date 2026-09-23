/**
 * Counterfactual Decision Transformation Math
 * Pure deterministic functions for comparing original dossier parameters against
 * current counterfactual overrides.
 *
 * Rules:
 * - Pure functions with zero side effects
 * - NO any, NO non-null assertions
 * - NO BUY, SELL, HOLD, SAFE, UNSAFE, or trade recommendations
 * - Fail-closed: guards against non-finite inputs, leverage <= 1, and leverage > 25
 */

import { computeLiquidationDistance } from '@/src/engine/risk-engine';

export const PRESET_STRESS_LEVERAGE = 10;
export const MAX_LEVERAGE_ALLOWED = 25;
export const MIN_LEVERAGE_STRESS = 1;

export interface CounterfactualDeltaInput {
  originalLeverage: number;
  originalLiquidationDistancePct: number | null | undefined;
  currentLeverage: number;
  currentLiquidationDistancePct: number | null | undefined;
}

export interface CounterfactualDeltaResult {
  originalLeverage: number;
  currentLeverage: number;
  originalLiquidationDistancePct: number | null;
  currentLiquidationDistancePct: number | null;
  /** Delta in percentage points: |current| - |original| (negative when buffer narrows) */
  deltaPercentagePoints: number | null;
  /** Signed difference: current - original */
  signedDeltaPercentagePoints: number | null;
  /** Distance moved closer to the index: |original| - |current| (positive when closer) */
  closerPercentagePoints: number | null;
  /** Formatted delta label, e.g. "-23.3 pp", "+0.0 pp", "0.0 pp", or "UNAVAILABLE" */
  deltaFormatted: string;
  isUnchanged: boolean;
  isRefusal: boolean;
  interpretation: string;
}

/**
 * Formats a liquidation distance percentage with sign, e.g. "-32.8%" or "+32.8%".
 * Returns "NONE" for unleveraged (leverage <= 1) and "UNAVAILABLE" for missing/guarded data.
 */
export function formatLiquidationDistance(
  pct: number | null | undefined,
  leverage: number
): string {
  if (leverage <= MIN_LEVERAGE_STRESS) {
    return 'NONE';
  }
  if (leverage > MAX_LEVERAGE_ALLOWED) {
    return 'UNAVAILABLE';
  }
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return 'UNAVAILABLE';
  }
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/**
 * Computes deterministic before/current delta and plain-language interpretation.
 * Never outputs trade recommendations or BUY/SELL/HOLD/SAFE/UNSAFE language.
 */
export function computeCounterfactualDelta(
  input: CounterfactualDeltaInput
): CounterfactualDeltaResult {
  const {
    originalLeverage,
    originalLiquidationDistancePct,
    currentLeverage,
    currentLiquidationDistancePct,
  } = input;

  const isOrigFinite = Number.isFinite(originalLeverage);
  const isCurrFinite = Number.isFinite(currentLeverage);

  if (!isOrigFinite || !isCurrFinite) {
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct: null,
      currentLiquidationDistancePct: null,
      deltaPercentagePoints: null,
      signedDeltaPercentagePoints: null,
      closerPercentagePoints: null,
      deltaFormatted: 'UNAVAILABLE',
      isUnchanged: false,
      isRefusal: true,
      interpretation: 'Invalid leverage input.',
    };
  }

  // Guard: leverage > 25 refusal
  if (currentLeverage > MAX_LEVERAGE_ALLOWED) {
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct:
        originalLiquidationDistancePct !== undefined &&
        originalLiquidationDistancePct !== null &&
        Number.isFinite(originalLiquidationDistancePct)
          ? originalLiquidationDistancePct
          : null,
      currentLiquidationDistancePct: null,
      deltaPercentagePoints: null,
      signedDeltaPercentagePoints: null,
      closerPercentagePoints: null,
      deltaFormatted: 'REFUSAL',
      isUnchanged: false,
      isRefusal: true,
      interpretation: `Refusal: leverage exceeds maximum allowed limit (${MAX_LEVERAGE_ALLOWED}x).`,
    };
  }

  // Guard: leverage <= 1 unleveraged position
  if (currentLeverage <= MIN_LEVERAGE_STRESS) {
    const isSameUnleveraged = originalLeverage <= MIN_LEVERAGE_STRESS;
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct:
        originalLiquidationDistancePct !== undefined &&
        originalLiquidationDistancePct !== null &&
        Number.isFinite(originalLiquidationDistancePct)
          ? originalLiquidationDistancePct
          : null,
      currentLiquidationDistancePct: null,
      deltaPercentagePoints: isSameUnleveraged ? 0 : null,
      signedDeltaPercentagePoints: isSameUnleveraged ? 0 : null,
      closerPercentagePoints: isSameUnleveraged ? 0 : null,
      deltaFormatted: isSameUnleveraged ? '0.0 pp' : 'N/A',
      isUnchanged: isSameUnleveraged,
      isRefusal: false,
      interpretation: 'Unleveraged position (no liquidation risk).',
    };
  }

  // Check for missing liquidation distances
  if (
    originalLiquidationDistancePct === null ||
    originalLiquidationDistancePct === undefined ||
    !Number.isFinite(originalLiquidationDistancePct) ||
    currentLiquidationDistancePct === null ||
    currentLiquidationDistancePct === undefined ||
    !Number.isFinite(currentLiquidationDistancePct)
  ) {
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct: null,
      currentLiquidationDistancePct: null,
      deltaPercentagePoints: null,
      signedDeltaPercentagePoints: null,
      closerPercentagePoints: null,
      deltaFormatted: 'UNAVAILABLE',
      isUnchanged: originalLeverage === currentLeverage,
      isRefusal: false,
      interpretation: 'Liquidation distance unavailable for calculation.',
    };
  }

  const orig = originalLiquidationDistancePct;
  const curr = currentLiquidationDistancePct;

  // Check if leverage is unchanged
  if (originalLeverage === currentLeverage || Math.abs(curr - orig) < 0.0001) {
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct: orig,
      currentLiquidationDistancePct: curr,
      deltaPercentagePoints: 0,
      signedDeltaPercentagePoints: 0,
      closerPercentagePoints: 0,
      deltaFormatted: '0.0 pp',
      isUnchanged: true,
      isRefusal: false,
      interpretation: 'Leverage unchanged from original dossier values.',
    };
  }

  // Delta in buffer magnitude: |current| - |original| (e.g. 9.5 - 32.8333 = -23.3333 pp)
  const deltaPp = Number((Math.abs(curr) - Math.abs(orig)).toFixed(4));
  const signedDelta = Number((curr - orig).toFixed(4));
  const closerPp = Number((Math.abs(orig) - Math.abs(curr)).toFixed(4));

  if (currentLeverage > originalLeverage) {
    return {
      originalLeverage,
      currentLeverage,
      originalLiquidationDistancePct: orig,
      currentLiquidationDistancePct: curr,
      deltaPercentagePoints: deltaPp,
      signedDeltaPercentagePoints: signedDelta,
      closerPercentagePoints: closerPp,
      deltaFormatted: `${deltaPp.toFixed(1)} pp`,
      isUnchanged: false,
      isRefusal: false,
      interpretation: 'Higher leverage moves the liquidation line closer to the frozen index.',
    };
  }

  // Lower leverage: moves liquidation line further from the index
  return {
    originalLeverage,
    currentLeverage,
    originalLiquidationDistancePct: orig,
    currentLiquidationDistancePct: curr,
    deltaPercentagePoints: deltaPp,
    signedDeltaPercentagePoints: signedDelta,
    closerPercentagePoints: closerPp,
    deltaFormatted: `+${deltaPp.toFixed(1)} pp`,
    isUnchanged: false,
    isRefusal: false,
    interpretation: 'Lower leverage moves the liquidation line further from the frozen index.',
  };
}

/**
 * Calculates liquidation distance using risk engine for a given leverage and direction.
 */
export function calculateCounterfactualLiquidation(
  spotPrice: number,
  leverage: number,
  direction: 'long' | 'short'
): number | null {
  if (leverage <= MIN_LEVERAGE_STRESS || leverage > MAX_LEVERAGE_ALLOWED) {
    return null;
  }
  try {
    return Number(computeLiquidationDistance(spotPrice, leverage, direction).toFixed(4));
  } catch {
    return null;
  }
}

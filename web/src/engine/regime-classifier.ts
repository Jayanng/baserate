/**
 * BaseRate Regime Classifier
 * Deterministic fixed-window statistical classifier using the last N candles.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Published thresholds exported as named constants
 * - Same inputs always produce same tag
 */

import { type RegimeTag } from '../domain/types';

export const MIN_REGIME_CANDLES = 50;
export const SMA20_PERIOD = 20;
export const SMA50_PERIOD = 50;
export const VOLATILITY_PERIOD = 20;
export const MOMENTUM_PERIOD = 5;

export const CAPITULATION_RETURN_PCT = -8;
export const SQUEEZE_RETURN_PCT = 8;
export const TREND_UP_SMA_MULTIPLIER = 1.02;
export const TREND_DOWN_SMA_MULTIPLIER = 0.98;

export interface RegimeFeatures {
  sma20: number;
  sma50: number;
  stdDev20: number;
  return5dPct: number;
}

/**
 * Computes statistical features over the last candles.
 * Returns null if fewer than MIN_REGIME_CANDLES candles are provided.
 */
export function computeRegimeFeatures(
  candles: Array<{ close: number }>
): RegimeFeatures | null {
  if (!candles || candles.length < MIN_REGIME_CANDLES) {
    return null;
  }

  const len = candles.length;
  const recent50 = candles.slice(-SMA50_PERIOD);
  const recent20 = candles.slice(-SMA20_PERIOD);

  const sum50 = recent50.reduce((acc, c) => acc + c.close, 0);
  const sma50 = sum50 / SMA50_PERIOD;

  const sum20 = recent20.reduce((acc, c) => acc + c.close, 0);
  const sma20 = sum20 / SMA20_PERIOD;

  const variance20 =
    recent20.reduce((acc, c) => acc + Math.pow(c.close - sma20, 2), 0) /
    SMA20_PERIOD;
  const stdDev20 = Math.sqrt(variance20);

  const lastCandle = candles[len - 1];
  const baseCandle = candles[len - 1 - MOMENTUM_PERIOD];

  if (!lastCandle || !baseCandle || baseCandle.close <= 0) {
    return null;
  }

  const return5dPct =
    ((lastCandle.close - baseCandle.close) / baseCandle.close) * 100;

  return {
    sma20,
    sma50,
    stdDev20,
    return5dPct,
  };
}

/**
 * Classifies the market regime deterministically from daily candles.
 *
 * Rules:
 * - If candles.length < 50: return 'insufficient_evidence'
 * - If 5-period return < -8%: return 'capitulation'
 * - If 5-period return > +8%: return 'squeeze'
 * - If SMA20 > SMA50 * 1.02 AND 5-period return > 0: return 'trend_up'
 * - If SMA20 < SMA50 * 0.98 AND 5-period return < 0: return 'trend_down'
 * - Otherwise: return 'chop'
 */
export function classifyRegime(candles: Array<{ close: number }>): RegimeTag {
  const features = computeRegimeFeatures(candles);
  if (!features) {
    return 'insufficient_evidence';
  }

  const { sma20, sma50, return5dPct } = features;

  if (return5dPct < CAPITULATION_RETURN_PCT) {
    return 'capitulation';
  }

  if (return5dPct > SQUEEZE_RETURN_PCT) {
    return 'squeeze';
  }

  if (sma20 > sma50 * TREND_UP_SMA_MULTIPLIER && return5dPct > 0) {
    return 'trend_up';
  }

  if (sma20 < sma50 * TREND_DOWN_SMA_MULTIPLIER && return5dPct < 0) {
    return 'trend_down';
  }

  return 'chop';
}

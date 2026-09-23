import { describe, it, expect } from 'vitest';
import {
  computeLiquidationDistance,
  computeFundingCarry,
  computeWorstGap,
} from '@/src/engine/risk-engine';

describe('risk-engine', () => {
  describe('computeLiquidationDistance', () => {
    it('computes long 3x at 228 -> liq distance approx -32.8%', () => {
      // liq = 228 * (1 - 1/3 + 0.005) = 228 * (2/3 + 0.005) = 153.14
      // dist % = ((153.14 - 228) / 228) * 100 = -32.8333%
      const distance = computeLiquidationDistance(228, 3, 'long');
      expect(distance).toBeCloseTo(-32.8333, 2);
    });

    it('computes short 3x at 228 -> liq distance approx +32.8%', () => {
      // liq = 228 * (1 + 1/3 - 0.005) = 228 * (4/3 - 0.005) = 302.86
      // dist % = ((302.86 - 228) / 228) * 100 = +32.8333%
      const distance = computeLiquidationDistance(228, 3, 'short');
      expect(distance).toBeCloseTo(32.8333, 2);
    });

    it('throws Error("Invalid inputs") when leverage is 1 (leverage 1 throws)', () => {
      expect(() => computeLiquidationDistance(228, 1, 'long')).toThrow('Invalid inputs');
      expect(() => computeLiquidationDistance(228, 1, 'short')).toThrow('Invalid inputs');
    });

    it('throws Error("Invalid inputs") when leverage < 1 or entryPrice <= 0', () => {
      expect(() => computeLiquidationDistance(228, 0.5, 'long')).toThrow('Invalid inputs');
      expect(() => computeLiquidationDistance(228, 0, 'long')).toThrow('Invalid inputs');
      expect(() => computeLiquidationDistance(228, -2, 'long')).toThrow('Invalid inputs');
      expect(() => computeLiquidationDistance(0, 3, 'long')).toThrow('Invalid inputs');
      expect(() => computeLiquidationDistance(-100, 3, 'long')).toThrow('Invalid inputs');
    });
  });

  describe('computeFundingCarry', () => {
    it('computes funding carry over 60h (funding carry 0.000219 rate over 60h = 0.0016425 carry fraction / 0.16425%)', () => {
      // intervals = 60h / 8h = 7.5 intervals
      // Rule: carry = fundingRatePerInterval * intervals * 100 (as percentage)
      // carry = 0.000219 * 7.5 * 100 = 0.16425%
      const carryPct = computeFundingCarry(0.000219, 60);
      expect(carryPct).toBeCloseTo(0.16425, 5);

      // Verify unscaled fraction (0.000219 * 7.5 = 0.0016425) if rate is passed as percentage (0.000219%):
      const carryFromPct = computeFundingCarry(0.000219 / 100, 60);
      expect(carryFromPct).toBeCloseTo(0.0016425, 7);
    });

    it('throws Error("Invalid inputs") on invalid inputs', () => {
      expect(() => computeFundingCarry(NaN, 60)).toThrow('Invalid inputs');
      expect(() => computeFundingCarry(0.0001, -10)).toThrow('Invalid inputs');
    });
  });

  describe('computeWorstGap', () => {
    it('sorts by pct ascending and returns most negative gap (worst gap sorts correctly)', () => {
      const gaps = [
        { pct: 4.5 },
        { pct: -2.3 },
        { pct: -14.8 },
        { pct: 0.1 },
        { pct: -8.2 },
      ];
      const worst = computeWorstGap(gaps);
      expect(worst).toBe(-14.8);
    });

    it('returns null for empty gaps array (empty gaps returns null)', () => {
      expect(computeWorstGap([])).toBeNull();
    });
  });
});

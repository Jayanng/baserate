import { describe, it, expect } from 'vitest';
import {
  computeDepthStress,
  type DepthLevel,
} from '@/src/engine/depth-stress';

describe('computeDepthStress pure engine', () => {
  describe('exact VWAP math & level consumption', () => {
    it('accurately computes VWAP, slippage, and levels consumed on a small hand-computed book', () => {
      // 3 levels:
      // Level 0: price = 100, size = 1 (notional = 100.00)
      // Level 1: price = 105, size = 2 (notional = 210.00)
      // Level 2: price = 110, size = 5 (notional = 550.00)
      const asks: DepthLevel[] = [
        { price: 100, size: 1 },
        { price: 105, size: 2 },
        { price: 110, size: 5 },
      ];

      // Request 200 USDT notional:
      // Level 0 gives 100 USDT (1 unit base)
      // Level 1 gives remaining 100 USDT (100 / 105 = 20/21 units base)
      // Total notional = 200.00 USDT
      // Total base = 1 + 20/21 = 41/21 units base
      // VWAP = 200 / (41/21) = 4200 / 41 = 102.4390243902439
      // estimatedVwapPct = ((4200/41 - 100) / 100) * 100 = 100 / 41 = 2.4390243902439%
      // slippagePct = 2.4390243902439%
      const result = computeDepthStress({
        levels: asks,
        side: 'buy',
        requestedNotionalUsdt: 200,
        referencePrice: 100,
        observedAtUtc: '2026-09-23T12:00:00.000Z',
      });

      expect(result.state).toBe('ok');
      expect(result.side).toBe('buy');
      expect(result.requestedNotionalUsdt).toBe(200);
      expect(result.coveredNotionalUsdt).toBe(200);
      expect(result.levelsConsumed).toBe(2);
      expect(result.observedAtUtc).toBe('2026-09-23T12:00:00.000Z');
      expect(result.reason).toBeNull();

      const expectedVwapPct = 100 / 41;
      expect(result.estimatedVwapPct).not.toBeNull();
      expect(result.slippagePct).not.toBeNull();
      expect(Math.abs((result.estimatedVwapPct ?? 0) - expectedVwapPct)).toBeLessThan(1e-10);
      expect(Math.abs((result.slippagePct ?? 0) - expectedVwapPct)).toBeLessThan(1e-10);
    });

    it('verifies exact notional sums to the cent with partial consumption', () => {
      // Level 0: 200.00 * 1.0 = 200.00 USDT
      // Level 1: 202.00 * 0.5 = 101.00 USDT
      // Level 2: 204.00 * 1.0 = 204.00 USDT
      const asks: DepthLevel[] = [
        { price: 200, size: 1.0 },
        { price: 202, size: 0.5 },
        { price: 204, size: 1.0 },
      ];

      // Exactly 301.00 USDT: consumes Level 0 (200.00) + Level 1 (101.00)
      // Total base = 1.0 + 0.5 = 1.5
      // VWAP = 301 / 1.5 = 200.66666666666666
      const result = computeDepthStress({
        levels: asks,
        side: 'buy',
        requestedNotionalUsdt: 301,
        referencePrice: 200,
      });

      expect(result.state).toBe('ok');
      expect(result.coveredNotionalUsdt).toBe(301);
      expect(result.levelsConsumed).toBe(2);
      expect(result.estimatedVwapPct).toBeCloseTo(0.333333, 5);
      expect(result.slippagePct).toBeCloseTo(0.333333, 5);
    });
  });

  describe('buy vs sell sign conventions', () => {
    it('produces positive estimatedVwapPct and positive slippagePct for buy', () => {
      const asks: DepthLevel[] = [
        { price: 102, size: 10 },
      ];

      const result = computeDepthStress({
        levels: asks,
        side: 'buy',
        requestedNotionalUsdt: 510,
        referencePrice: 100,
      });

      expect(result.state).toBe('ok');
      expect(result.estimatedVwapPct).toBe(2.0); // ((102 - 100) / 100) * 100 = +2%
      expect(result.slippagePct).toBe(2.0); // Cost is +2%
    });

    it('produces signed negative estimatedVwapPct and positive slippage cost for sell', () => {
      // Level 0: price = 100, size = 1 (100 notional)
      // Level 1: price = 95, size = 2 (190 notional)
      const bids: DepthLevel[] = [
        { price: 100, size: 1 },
        { price: 95, size: 2 },
      ];

      // Request 200 USDT notional:
      // Level 0 gives 100 USDT (1 unit base)
      // Level 1 gives 100 USDT (100 / 95 = 20/19 units base)
      // Total base = 1 + 20/19 = 39/19
      // VWAP = 200 / (39/19) = 3800 / 39 = 97.43589743589743
      // estimatedVwapPct = ((3800/39 - 100) / 100) * 100 = -100 / 39 = -2.564102564102564% (signed!)
      // slippagePct = ((100 - 3800/39) / 100) * 100 = +100 / 39 = +2.564102564102564% (positive cost!)
      const result = computeDepthStress({
        levels: bids,
        side: 'sell',
        requestedNotionalUsdt: 200,
        referencePrice: 100,
      });

      expect(result.state).toBe('ok');
      expect(result.side).toBe('sell');
      expect(result.levelsConsumed).toBe(2);
      expect(result.coveredNotionalUsdt).toBe(200);

      const expectedSignedVwap = -100 / 39;
      const expectedSlippageCost = 100 / 39;
      expect(result.estimatedVwapPct).not.toBeNull();
      expect(result.slippagePct).not.toBeNull();
      expect(Math.abs((result.estimatedVwapPct ?? 0) - expectedSignedVwap)).toBeLessThan(1e-10);
      expect(Math.abs((result.slippagePct ?? 0) - expectedSlippageCost)).toBeLessThan(1e-10);
    });
  });

  describe('order book sorting guarantees', () => {
    it('sorts asks ascending for buys even if input is unordered', () => {
      const unsortedAsks: DepthLevel[] = [
        { price: 110, size: 10 },
        { price: 100, size: 5 },
        { price: 105, size: 5 },
      ];

      const result = computeDepthStress({
        levels: unsortedAsks,
        side: 'buy',
        requestedNotionalUsdt: 500, // fully covered by the 100 level
        referencePrice: 100,
      });

      expect(result.state).toBe('ok');
      expect(result.levelsConsumed).toBe(1); // Only the cheapest level (100) consumed
      expect(result.estimatedVwapPct).toBe(0);
      expect(result.slippagePct).toBe(0);
    });

    it('sorts bids descending for sells even if input is unordered', () => {
      const unsortedBids: DepthLevel[] = [
        { price: 90, size: 10 },
        { price: 100, size: 5 },
        { price: 95, size: 5 },
      ];

      const result = computeDepthStress({
        levels: unsortedBids,
        side: 'sell',
        requestedNotionalUsdt: 500, // fully covered by highest bid (100)
        referencePrice: 100,
      });

      expect(result.state).toBe('ok');
      expect(result.levelsConsumed).toBe(1); // Only highest bid (100) consumed
      expect(result.estimatedVwapPct).toBe(0);
      expect(result.slippagePct).toBe(0);
    });
  });

  describe('insufficient depth handling', () => {
    it('returns insufficient_depth when requested notional exceeds book depth without extrapolating', () => {
      const asks: DepthLevel[] = [
        { price: 100, size: 1 }, // 100 USDT
        { price: 105, size: 1 }, // 105 USDT
      ];
      // Total available: 205 USDT

      const result = computeDepthStress({
        levels: asks,
        side: 'buy',
        requestedNotionalUsdt: 500,
        referencePrice: 100,
        observedAtUtc: '2026-09-23T12:00:00.000Z',
      });

      expect(result.state).toBe('insufficient_depth');
      expect(result.observedAtUtc).toBe('2026-09-23T12:00:00.000Z');
      expect(result.requestedNotionalUsdt).toBe(500);
      expect(result.coveredNotionalUsdt).toBe(205);
      expect(result.levelsConsumed).toBe(2);
      expect(result.estimatedVwapPct).toBeNull();
      expect(result.slippagePct).toBeNull();
      expect(result.reason).toContain('exceeds total available');
    });
  });

  describe('fail-closed invalid input guards', () => {
    const validLevels: DepthLevel[] = [{ price: 100, size: 10 }];

    it('returns unavailable on empty book levels', () => {
      const result = computeDepthStress({
        levels: [],
        side: 'buy',
        requestedNotionalUsdt: 1000,
        referencePrice: 100,
      });

      expect(result.state).toBe('unavailable');
      expect(result.coveredNotionalUsdt).toBeNull();
      expect(result.levelsConsumed).toBeNull();
      expect(result.estimatedVwapPct).toBeNull();
      expect(result.slippagePct).toBeNull();
      expect(result.reason).toContain('empty');
    });

    it('returns unavailable on zero or negative requested notional', () => {
      const res0 = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: 0,
        referencePrice: 100,
      });
      expect(res0.state).toBe('unavailable');
      expect(res0.reason).toContain('positive finite number');

      const resNeg = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: -100,
        referencePrice: 100,
      });
      expect(resNeg.state).toBe('unavailable');
      expect(resNeg.reason).toContain('positive finite number');
    });

    it('returns unavailable on non-finite requested notional (NaN, Infinity)', () => {
      const resNaN = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: Number.NaN,
        referencePrice: 100,
      });
      expect(resNaN.state).toBe('unavailable');

      const resInf = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: Number.POSITIVE_INFINITY,
        referencePrice: 100,
      });
      expect(resInf.state).toBe('unavailable');
    });

    it('returns unavailable on zero or negative reference price', () => {
      const res0 = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: 0,
      });
      expect(res0.state).toBe('unavailable');
      expect(res0.reason).toContain('Reference price');

      const resNeg = computeDepthStress({
        levels: validLevels,
        side: 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: -50,
      });
      expect(resNeg.state).toBe('unavailable');
    });

    it('returns unavailable on invalid or non-positive level price or size', () => {
      const invalidPrice: DepthLevel[] = [
        { price: 0, size: 10 },
      ];
      const res1 = computeDepthStress({
        levels: invalidPrice,
        side: 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: 100,
      });
      expect(res1.state).toBe('unavailable');
      expect(res1.reason).toContain('Invalid or non-positive');

      const invalidSize: DepthLevel[] = [
        { price: 100, size: -2 },
      ];
      const res2 = computeDepthStress({
        levels: invalidSize,
        side: 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: 100,
      });
      expect(res2.state).toBe('unavailable');
      expect(res2.reason).toContain('Invalid or non-positive');

      const nanLevel: DepthLevel[] = [
        { price: Number.NaN, size: 5 },
      ];
      const res3 = computeDepthStress({
        levels: nanLevel,
        side: 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: 100,
      });
      expect(res3.state).toBe('unavailable');
    });

    it('returns unavailable on invalid side', () => {
      const res = computeDepthStress({
        levels: validLevels,
        side: 'diagonal' as unknown as 'buy',
        requestedNotionalUsdt: 100,
        referencePrice: 100,
      });
      expect(res.state).toBe('unavailable');
      expect(res.reason).toContain('Invalid side');
    });
  });
});

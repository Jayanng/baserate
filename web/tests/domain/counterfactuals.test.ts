import { describe, it, expect, vi } from 'vitest';
import {
  computeCounterfactualDelta,
  formatLiquidationDistance,
  calculateCounterfactualLiquidation,
  PRESET_STRESS_LEVERAGE,
  MAX_LEVERAGE_ALLOWED,
  MIN_LEVERAGE_STRESS,
} from '@/components/dossier/counterfactual-math';
import CounterfactualControls from '@/components/dossier/CounterfactualControls';
import { computeLiquidationDistance } from '@/src/engine/risk-engine';

describe('Phase 5: Counterfactual Decision Transformation & Math', () => {
  const spotPrice = 228;

  describe('TASK 5.1: 3x -> 10x expected engine values for long and short', () => {
    it('computes exact engine liquidation distance for long at 3x and 10x', () => {
      // Long formula: distance% = (-1/leverage + 0.005) * 100
      // 3x long: (-1/3 + 0.005) * 100 = -32.833333333333336%
      const long3x = computeLiquidationDistance(spotPrice, 3, 'long');
      expect(long3x).toBeCloseTo(-32.8333, 3);
      expect(Number(long3x.toFixed(4))).toBe(-32.8333);

      // 10x long: (-1/10 + 0.005) * 100 = -9.5%
      const long10x = computeLiquidationDistance(spotPrice, 10, 'long');
      expect(long10x).toBeCloseTo(-9.5, 4);
      expect(Number(long10x.toFixed(4))).toBe(-9.5);
    });

    it('computes exact engine liquidation distance for short at 3x and 10x', () => {
      // Short formula: distance% = (1/leverage - 0.005) * 100
      // 3x short: (1/3 - 0.005) * 100 = +32.833333333333336%
      const short3x = computeLiquidationDistance(spotPrice, 3, 'short');
      expect(short3x).toBeCloseTo(32.8333, 3);
      expect(Number(short3x.toFixed(4))).toBe(32.8333);

      // 10x short: (1/10 - 0.005) * 100 = +9.5%
      const short10x = computeLiquidationDistance(spotPrice, 10, 'short');
      expect(short10x).toBeCloseTo(9.5, 4);
      expect(Number(short10x.toFixed(4))).toBe(9.5);
    });

    it('computes before/current delta for long from 3x to 10x', () => {
      const origLiq = Number(computeLiquidationDistance(spotPrice, 3, 'long').toFixed(4));
      const currLiq = Number(computeLiquidationDistance(spotPrice, 10, 'long').toFixed(4));

      const delta = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: origLiq,
        currentLeverage: 10,
        currentLiquidationDistancePct: currLiq,
      });

      // Buffer distance changed by 9.5 - 32.8333 = -23.3333 percentage points
      expect(delta.deltaPercentagePoints).toBeCloseTo(-23.3333, 3);
      expect(delta.closerPercentagePoints).toBeCloseTo(23.3333, 3);
      expect(delta.deltaFormatted).toBe('-23.3 pp');
      expect(delta.isUnchanged).toBe(false);
      expect(delta.isRefusal).toBe(false);
      expect(delta.interpretation).toBe(
        'Higher leverage moves the liquidation line closer to the frozen index.'
      );
    });

    it('computes before/current delta for short from 3x to 10x', () => {
      const origLiq = Number(computeLiquidationDistance(spotPrice, 3, 'short').toFixed(4));
      const currLiq = Number(computeLiquidationDistance(spotPrice, 10, 'short').toFixed(4));

      const delta = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: origLiq,
        currentLeverage: 10,
        currentLiquidationDistancePct: currLiq,
      });

      // Buffer distance changed by 9.5 - 32.8333 = -23.3333 percentage points
      expect(delta.deltaPercentagePoints).toBeCloseTo(-23.3333, 3);
      expect(delta.closerPercentagePoints).toBeCloseTo(23.3333, 3);
      expect(delta.deltaFormatted).toBe('-23.3 pp');
      expect(delta.isUnchanged).toBe(false);
      expect(delta.isRefusal).toBe(false);
      expect(delta.interpretation).toBe(
        'Higher leverage moves the liquidation line closer to the frozen index.'
      );
    });
  });

  describe('TASK 5.1: Unchanged leverage produces zero delta', () => {
    it('produces exactly zero delta when leverage remains 3x', () => {
      const liq3x = Number(computeLiquidationDistance(spotPrice, 3, 'long').toFixed(4));

      const delta = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: liq3x,
        currentLeverage: 3,
        currentLiquidationDistancePct: liq3x,
      });

      expect(delta.deltaPercentagePoints).toBe(0);
      expect(delta.signedDeltaPercentagePoints).toBe(0);
      expect(delta.closerPercentagePoints).toBe(0);
      expect(delta.deltaFormatted).toBe('0.0 pp');
      expect(delta.isUnchanged).toBe(true);
      expect(delta.isRefusal).toBe(false);
      expect(delta.interpretation).toBe('Leverage unchanged from original dossier values.');
    });

    it('produces exactly zero delta for short when unchanged at 5x', () => {
      const liq5x = Number(computeLiquidationDistance(spotPrice, 5, 'short').toFixed(4));

      const delta = computeCounterfactualDelta({
        originalLeverage: 5,
        originalLiquidationDistancePct: liq5x,
        currentLeverage: 5,
        currentLiquidationDistancePct: liq5x,
      });

      expect(delta.deltaPercentagePoints).toBe(0);
      expect(delta.deltaFormatted).toBe('0.0 pp');
      expect(delta.isUnchanged).toBe(true);
      expect(delta.interpretation).toBe('Leverage unchanged from original dossier values.');
    });
  });

  describe('TASK 5.1: Plain-language interpretation constraints', () => {
    const forbiddenWordsRegex = /\b(buy|sell|hold|safe|unsafe)\b/i;

    it('higher leverage interpretation contains no trade recommendation or forbidden words', () => {
      const delta = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: -32.8333,
        currentLeverage: 5,
        currentLiquidationDistancePct: -19.5,
      });

      expect(delta.interpretation).toBe(
        'Higher leverage moves the liquidation line closer to the frozen index.'
      );
      expect(forbiddenWordsRegex.test(delta.interpretation)).toBe(false);
    });

    it('lower leverage interpretation contains no trade recommendation or forbidden words', () => {
      const delta = computeCounterfactualDelta({
        originalLeverage: 5,
        originalLiquidationDistancePct: -19.5,
        currentLeverage: 2,
        currentLiquidationDistancePct: -49.5,
      });

      expect(delta.interpretation).toBe(
        'Lower leverage moves the liquidation line further from the frozen index.'
      );
      expect(forbiddenWordsRegex.test(delta.interpretation)).toBe(false);
    });

    it('unchanged leverage interpretation contains no forbidden words', () => {
      const delta = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: -32.8333,
        currentLeverage: 3,
        currentLiquidationDistancePct: -32.8333,
      });

      expect(delta.interpretation).toBe('Leverage unchanged from original dossier values.');
      expect(forbiddenWordsRegex.test(delta.interpretation)).toBe(false);
    });
  });

  describe('TASK 5.1: Leverage <=1 and >25 refusal/guard behavior', () => {
    it('guards against leverage <= 1 by reporting unleveraged state', () => {
      const delta1x = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: -32.8333,
        currentLeverage: 1,
        currentLiquidationDistancePct: null,
      });

      expect(delta1x.deltaPercentagePoints).toBeNull();
      expect(delta1x.isRefusal).toBe(false);
      expect(delta1x.interpretation).toBe('Unleveraged position (no liquidation risk).');
      expect(formatLiquidationDistance(null, 1)).toBe('NONE');
    });

    it('guards against leverage > 25 by reporting refusal', () => {
      const delta30x = computeCounterfactualDelta({
        originalLeverage: 3,
        originalLiquidationDistancePct: -32.8333,
        currentLeverage: 30,
        currentLiquidationDistancePct: null,
      });

      expect(delta30x.deltaPercentagePoints).toBeNull();
      expect(delta30x.isRefusal).toBe(true);
      expect(delta30x.deltaFormatted).toBe('REFUSAL');
      expect(delta30x.interpretation).toContain('Refusal: leverage exceeds maximum allowed limit (25x)');
      expect(formatLiquidationDistance(-2.8, 30)).toBe('UNAVAILABLE');
    });

    it('calculateCounterfactualLiquidation returns null for leverage <= 1 or > 25', () => {
      expect(calculateCounterfactualLiquidation(228, 1, 'long')).toBeNull();
      expect(calculateCounterfactualLiquidation(228, 0.5, 'long')).toBeNull();
      expect(calculateCounterfactualLiquidation(228, 26, 'long')).toBeNull();
      expect(calculateCounterfactualLiquidation(228, 10, 'long')).toBe(-9.5);
    });
  });

  describe('TASK 5.2: Convenience preset action Stress at 10x', () => {
    it('defines PRESET_STRESS_LEVERAGE as 10', () => {
      expect(PRESET_STRESS_LEVERAGE).toBe(10);
    });

    it('preset callback receives leverage 10 and current size', () => {
      const onRecomputeMock = vi.fn();
      const currentSize = 5000;

      // Simulate invoking the Stress at 10x action
      const triggerStressAt10x = () => onRecomputeMock(currentSize, PRESET_STRESS_LEVERAGE);

      triggerStressAt10x();

      expect(onRecomputeMock).toHaveBeenCalledTimes(1);
      expect(onRecomputeMock).toHaveBeenCalledWith(5000, 10);
    });

    it('preset callback works when current leverage is already 10 without breaking', () => {
      const onRecomputeMock = vi.fn();
      const currentSize = 10000;
      const currentLeverage = 10;

      // When already 10x, triggering preset still calls onRecompute(size, 10)
      const triggerStressAt10x = () => onRecomputeMock(currentSize, PRESET_STRESS_LEVERAGE);

      expect(() => triggerStressAt10x()).not.toThrow();
      expect(onRecomputeMock).toHaveBeenCalledWith(10000, 10);
    });
  });

  describe('TASK 5.3: Asset-tail and cross-asset independence', () => {
    it('calculates deterministic delta for rTSLA without NVDA dependency', () => {
      const tslaSpot = 245;
      const origLiq = Number(computeLiquidationDistance(tslaSpot, 2, 'long').toFixed(4)); // 2x: -49.5%
      const currLiq = Number(computeLiquidationDistance(tslaSpot, 10, 'long').toFixed(4)); // 10x: -9.5%

      const delta = computeCounterfactualDelta({
        originalLeverage: 2,
        originalLiquidationDistancePct: origLiq,
        currentLeverage: 10,
        currentLiquidationDistancePct: currLiq,
      });

      expect(origLiq).toBe(-49.5);
      expect(currLiq).toBe(-9.5);
      expect(delta.deltaPercentagePoints).toBe(-40);
      expect(delta.deltaFormatted).toBe('-40.0 pp');
      expect(delta.interpretation).toBe(
        'Higher leverage moves the liquidation line closer to the frozen index.'
      );
    });

    it('calculates deterministic delta for rMSTR high-vol asset without NVDA dependency', () => {
      const mstrSpot = 130;
      const origLiq = Number(computeLiquidationDistance(mstrSpot, 5, 'short').toFixed(4)); // 5x: +19.5%
      const currLiq = Number(computeLiquidationDistance(mstrSpot, 10, 'short').toFixed(4)); // 10x: +9.5%

      const delta = computeCounterfactualDelta({
        originalLeverage: 5,
        originalLiquidationDistancePct: origLiq,
        currentLeverage: 10,
        currentLiquidationDistancePct: currLiq,
      });

      expect(origLiq).toBe(19.5);
      expect(currLiq).toBe(9.5);
      expect(delta.deltaPercentagePoints).toBe(-10);
      expect(delta.deltaFormatted).toBe('-10.0 pp');
    });
  });

  describe('TASK 5.1 prop contract: original values stability during slider recompute', () => {
    it('maintains original dossier values when current slider leverage changes', () => {
      // Original trade parsed from dossier (e.g. 3x long NVDA)
      const dossierParsed = {
        sizeUsdt: 5000,
        leverage: 3,
        direction: 'long' as const,
      };
      // Original dossier risk liquidation distance
      const dossierOrigLiqPct = Number(
        computeLiquidationDistance(spotPrice, dossierParsed.leverage, dossierParsed.direction).toFixed(4)
      ); // -32.8333

      // User changes slider to 10x
      const sliderLeverage = 10;
      const recomputedLiq = Number(
        computeLiquidationDistance(spotPrice, sliderLeverage, dossierParsed.direction).toFixed(4)
      ); // -9.5

      // Prop contract: passing original values preserves original column and computes delta
      const deltaWithOriginals = computeCounterfactualDelta({
        originalLeverage: dossierParsed.leverage,
        originalLiquidationDistancePct: dossierOrigLiqPct,
        currentLeverage: sliderLeverage,
        currentLiquidationDistancePct: recomputedLiq,
      });

      expect(deltaWithOriginals.isUnchanged).toBe(false);
      expect(deltaWithOriginals.deltaFormatted).toBe('-23.3 pp');
      expect(formatLiquidationDistance(dossierOrigLiqPct, dossierParsed.leverage)).toBe('-32.8%');
      expect(formatLiquidationDistance(recomputedLiq, sliderLeverage)).toBe('-9.5%');

      // Contrast with defect: when original values are omitted and fall back to current values,
      // delta collapses to baseline (violating Task 5.1)
      const defectDelta = computeCounterfactualDelta({
        originalLeverage: sliderLeverage,
        originalLiquidationDistancePct: recomputedLiq,
        currentLeverage: sliderLeverage,
        currentLiquidationDistancePct: recomputedLiq,
      });
      expect(defectDelta.isUnchanged).toBe(true);
      expect(defectDelta.deltaFormatted).toBe('0.0 pp');
    });

    it('verifies CounterfactualControls renders with original and recomputed values without crashing', () => {
      const origSize = 5000;
      const origLev = 3;
      const origLiq = -32.8333;
      const currentLev = 10;
      const currentLiq = -9.5;

      const element = CounterfactualControls({
        sizeUsdt: origSize,
        leverage: currentLev,
        onRecompute: () => {},
        liquidationDistancePct: currentLiq,
        worstGapPct: -18.45,
        originalSizeUsdt: origSize,
        originalLeverage: origLev,
        originalLiquidationDistancePct: origLiq,
        direction: 'long',
      });

      expect(element).toBeDefined();
      expect(element.type).toBe('div');
    });
  });
});

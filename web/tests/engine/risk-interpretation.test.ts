import { describe, it, expect } from 'vitest';
import {
  interpretRisk,
  computeRiskInterpretation,
} from '@/src/engine/risk-interpretation';

describe('risk-interpretation engine', () => {
  const FORBIDDEN_WORDS_REGEX =
    /\b(buy|sell|hold|safe|unsafe|safer|safest|advice|recommend|recommendation)\b/i;

  describe('valid values (standard baseline)', () => {
    it('produces a structured deterministic interpretation for typical valid inputs', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8333,
        worstGapPct: -18.45,
        fundingCarryPct: 0.16425,
        sampleSize: 1227,
      });

      expect(result.isComplete).toBe(true);
      expect(result.code).toBe('HISTORY_WITHIN_LIQUIDATION');
      expect(result.state).toBe('within_buffer');
      expect(result.headline).toBe('Observed history did not reach liquidation line');
      expect(result.summary).toBe(
        'Observed history did not reach the current liquidation line, but the tail remains material.'
      );
      expect(result.provenanceLabel).toBe('computed');

      // Check inputs are stored
      expect(result.inputs.liquidationDistancePct).toBe(-32.8333);
      expect(result.inputs.worstGapPct).toBe(-18.45);
      expect(result.inputs.sampleSize).toBe(1227);
      expect(result.inputs.fundingCarryPct).toBe(0.16425);

      // Check supporting facts include sample size and funding carry
      const factsText = result.supportingFacts.join(' ');
      expect(factsText).toContain('1,227');
      expect(factsText).toContain('+0.16%');
      expect(factsText).toContain('-32.8%');
      expect(factsText).toContain('-18.4%');
    });

    it('aliases computeRiskInterpretation to interpretRisk', () => {
      expect(computeRiskInterpretation).toBe(interpretRisk);
    });
  });

  describe('liquidation-breached-history case', () => {
    it('returns breached state when worst gap exceeds liquidation line', () => {
      // 10x leverage case: liq distance is -9.5%, but historical worst was -18.45%
      const result = interpretRisk({
        liquidationDistancePct: -9.5,
        worstGapPct: -18.45,
        fundingCarryPct: 0.16,
        sampleSize: 1227,
      });

      expect(result.isComplete).toBe(true);
      expect(result.code).toBe('HISTORY_BREACHED_LIQUIDATION');
      expect(result.state).toBe('breached');
      expect(result.headline).toBe('Historical sample includes liquidation breaches');
      expect(result.summary).toBe(
        'The historical sample includes outcomes through the proposed liquidation distance.'
      );
      expect(result.supportingFacts.length).toBeGreaterThan(2);

      const factsText = result.supportingFacts.join(' ');
      expect(factsText).toContain('-9.5%');
      expect(factsText).toContain('-18.4%');
      expect(factsText).toContain('1,227');
    });

    it('returns breached state when gapThroughLiquidationRate is positive', () => {
      const result = interpretRisk({
        liquidationDistancePct: -15.0,
        worstGapPct: -18.0,
        gapThroughLiquidationRate: 0.03, // 3%
        sampleSize: 500,
      });

      expect(result.isComplete).toBe(true);
      expect(result.code).toBe('HISTORY_BREACHED_LIQUIDATION');
      expect(result.state).toBe('breached');
      expect(result.summary).toBe(
        'The historical sample includes outcomes through the proposed liquidation distance.'
      );
      expect(result.inputs.gapThroughLiquidationRate).toBe(0.03);

      const factsText = result.supportingFacts.join(' ');
      expect(factsText).toContain('3.0%');
    });

    it('handles high-tail assets like rMSTR (-61.74% worst gap)', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: -61.74,
        sampleSize: 1227,
      });

      expect(result.code).toBe('HISTORY_BREACHED_LIQUIDATION');
      expect(result.summary).toBe(
        'The historical sample includes outcomes through the proposed liquidation distance.'
      );
    });

    it('computes breached rate from gaps array for long trades', () => {
      const gaps = [
        { pct: 2.0 },
        { pct: -5.0 },
        { pct: -12.0 },
        { pct: -25.0 }, // breaches -20%
      ];

      const result = interpretRisk({
        liquidationDistancePct: -20.0,
        worstGapPct: -25.0,
        gaps,
        direction: 'long',
      });

      expect(result.code).toBe('HISTORY_BREACHED_LIQUIDATION');
      expect(result.inputs.gapThroughLiquidationRate).toBe(0.25); // 1 out of 4 = 25%
    });

    it('computes breached rate from gaps array for short trades', () => {
      const gaps = [
        { pct: -2.0 },
        { pct: 5.0 },
        { pct: 15.0 },
        { pct: 25.0 }, // breaches +20%
      ];

      const result = interpretRisk({
        liquidationDistancePct: 20.0,
        worstGapPct: -2.0,
        gaps,
        direction: 'short',
      });

      expect(result.code).toBe('HISTORY_BREACHED_LIQUIDATION');
      expect(result.inputs.gapThroughLiquidationRate).toBe(0.25);
    });
  });

  describe('incomplete evidence case', () => {
    it('returns refusal interpretation when liquidation distance is null', () => {
      const result = interpretRisk({
        liquidationDistancePct: null,
        worstGapPct: -18.5,
        sampleSize: 100,
      });

      expect(result.isComplete).toBe(false);
      expect(result.code).toBe('INCOMPLETE_EVIDENCE');
      expect(result.state).toBe('incomplete');
      expect(result.summary).toBe(
        'Evidence is incomplete, so no historical conclusion is shown.'
      );
    });

    it('returns refusal interpretation when liquidation distance is NaN or non-finite', () => {
      const result = interpretRisk({
        liquidationDistancePct: NaN,
        worstGapPct: -18.5,
        sampleSize: 100,
      });

      expect(result.code).toBe('INCOMPLETE_EVIDENCE');
      expect(result.isComplete).toBe(false);
    });

    it('returns refusal interpretation when worst gap is null', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: null,
        sampleSize: 100,
      });

      expect(result.code).toBe('INCOMPLETE_EVIDENCE');
      expect(result.isComplete).toBe(false);
    });

    it('returns refusal interpretation when sample size is missing or 0', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: -18.5,
        sampleSize: 0,
      });

      expect(result.code).toBe('INCOMPLETE_EVIDENCE');
      expect(result.isComplete).toBe(false);
    });

    it('returns refusal interpretation when refusal state is present', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: -18.5,
        sampleSize: 1000,
        refusal: {
          code: 'INSUFFICIENT_EVIDENCE',
          reason: 'Missing required candles',
        },
      });

      expect(result.code).toBe('INCOMPLETE_EVIDENCE');
      expect(result.state).toBe('incomplete');
      expect(result.isComplete).toBe(false);
    });
  });

  describe('zero gap-through rate case', () => {
    it('returns within_buffer when gapThroughLiquidationRate is explicitly 0', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: -18.5,
        gapThroughLiquidationRate: 0,
        fundingCarryPct: 0.16,
        sampleSize: 1227,
      });

      expect(result.isComplete).toBe(true);
      expect(result.code).toBe('HISTORY_WITHIN_LIQUIDATION');
      expect(result.state).toBe('within_buffer');
      expect(result.summary).toBe(
        'Observed history did not reach the current liquidation line, but the tail remains material.'
      );
      expect(result.headline).toBe('Observed history did not reach liquidation line');

      const factsText = result.supportingFacts.join(' ');
      expect(factsText).toContain('0.0%');
      expect(factsText).toContain('Historical observations are not guarantees and the tail remains material.');
    });

    it('omits funding carry fact gracefully if fundingCarryPct is null', () => {
      const result = interpretRisk({
        liquidationDistancePct: -32.8,
        worstGapPct: -18.5,
        gapThroughLiquidationRate: 0,
        fundingCarryPct: null,
        sampleSize: 1227,
      });

      expect(result.isComplete).toBe(true);
      expect(result.inputs.fundingCarryPct).toBeNull();
      const factsText = result.supportingFacts.join(' ');
      expect(factsText).not.toContain('funding carry');
    });
  });

  describe('no forbidden trade language constraint', () => {
    it('guarantees zero occurrences of BUY, SELL, HOLD, SAFE, UNSAFE, advice, recommendation across all states', () => {
      const scenarios = [
        // Standard unbreached
        interpretRisk({
          liquidationDistancePct: -32.8,
          worstGapPct: -18.5,
          gapThroughLiquidationRate: 0,
          fundingCarryPct: 0.16,
          sampleSize: 1227,
        }),
        // Breached
        interpretRisk({
          liquidationDistancePct: -9.5,
          worstGapPct: -18.5,
          gapThroughLiquidationRate: 0.05,
          fundingCarryPct: 0.16,
          sampleSize: 1227,
        }),
        // Incomplete / refusal
        interpretRisk({
          liquidationDistancePct: null,
          worstGapPct: null,
        }),
        // High tail asset
        interpretRisk({
          liquidationDistancePct: -30.0,
          worstGapPct: -61.74,
          sampleSize: 1227,
        }),
      ];

      for (const res of scenarios) {
        expect(res.headline).not.toMatch(FORBIDDEN_WORDS_REGEX);
        expect(res.summary).not.toMatch(FORBIDDEN_WORDS_REGEX);
        expect(res.code).not.toMatch(FORBIDDEN_WORDS_REGEX);
        expect(res.state).not.toMatch(FORBIDDEN_WORDS_REGEX);
        for (const fact of res.supportingFacts) {
          expect(fact).not.toMatch(FORBIDDEN_WORDS_REGEX);
        }
      }
    });
  });
});

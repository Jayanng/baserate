/**
 * BaseRate Deterministic Risk Interpretation Engine
 * Evaluates proposed position liquidation distance against historical weekend gap distributions.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Deterministic output only (NO LLM calls, NO speculative inference)
 * - NO BUY, SELL, HOLD, SAFE, UNSAFE, recommendation, advice, or instruction language
 * - Fail-closed on missing or non-finite critical inputs
 */

import type {
  EvidenceLabel,
  RefusalState,
  RiskInterpretation,
  RiskInterpretationCode,
  RiskInterpretationState,
  TradeDirection,
} from '../domain/types';

export type {
  RiskInterpretation,
  RiskInterpretationCode,
  RiskInterpretationState,
};

export interface RiskInterpretationInputs {
  liquidationDistancePct?: number | null;
  liquidationDistance?: number | null;
  worstGapPct?: number | null;
  worstObservedGap?: number | null;
  gapThroughLiquidationRate?: number | null;
  fundingCarryPct?: number | null;
  fundingCarry?: number | null;
  sampleSize?: number | null;
  refusal?: RefusalState | null;
  gaps?: Array<{ pct: number }> | null;
  direction?: TradeDirection | 'long' | 'short';
}

function formatSignedPct(val: number, decimals = 1): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)}%`;
}

function formatRate(rate: number): string {
  if (rate === 0) return '0.0%';
  if (rate <= 1) {
    return `${(rate * 100).toFixed(1)}%`;
  }
  return `${rate.toFixed(1)}%`;
}

/**
 * Deterministically interprets position risk against historical weekend distributions.
 *
 * Cases:
 * 1. Incomplete evidence / missing critical values / refusal -> Refusal interpretation
 * 2. Observed history includes outcomes through liquidation distance -> Breached interpretation
 * 3. Observed history did not reach liquidation line -> Within-buffer interpretation with tail warning
 */
export function interpretRisk(
  inputs: RiskInterpretationInputs
): RiskInterpretation {
  const liqDist = inputs.liquidationDistancePct ?? inputs.liquidationDistance ?? null;
  const worstGap = inputs.worstGapPct ?? inputs.worstObservedGap ?? null;
  const sampleSize =
    typeof inputs.sampleSize === 'number'
      ? inputs.sampleSize
      : Array.isArray(inputs.gaps)
        ? inputs.gaps.length
        : null;
  const fundingCarry = inputs.fundingCarryPct ?? inputs.fundingCarry ?? null;
  const rawRate = inputs.gapThroughLiquidationRate ?? null;
  const refusal = inputs.refusal ?? null;
  const direction = inputs.direction ?? 'long';

  const isLiqValid = typeof liqDist === 'number' && Number.isFinite(liqDist);
  const isWorstGapValid = typeof worstGap === 'number' && Number.isFinite(worstGap);
  const isSampleSizeValid =
    typeof sampleSize === 'number' && Number.isFinite(sampleSize) && sampleSize > 0;
  const hasRefusal = refusal !== null && refusal !== undefined;

  // Case 1: Incomplete evidence or critical values are null / non-finite
  if (!isLiqValid || !isWorstGapValid || !isSampleSizeValid || hasRefusal) {
    return {
      headline: 'Evidence incomplete',
      summary: 'Evidence is incomplete, so no historical conclusion is shown.',
      code: 'INCOMPLETE_EVIDENCE',
      state: 'incomplete',
      isComplete: false,
      supportingFacts: [
        'Evidence is incomplete or missing critical risk values; stress conclusion cannot be computed.',
      ],
      inputs: {
        liquidationDistancePct: isLiqValid ? liqDist : null,
        worstGapPct: isWorstGapValid ? worstGap : null,
        gapThroughLiquidationRate: null,
        fundingCarryPct:
          typeof fundingCarry === 'number' && Number.isFinite(fundingCarry)
            ? fundingCarry
            : null,
        sampleSize: isSampleSizeValid ? sampleSize : null,
      },
      provenanceLabel: 'computed' as EvidenceLabel,
    };
  }

  // Derive gap-through-liquidation rate if not directly provided
  let resolvedRate: number | null = null;
  if (typeof rawRate === 'number' && Number.isFinite(rawRate)) {
    resolvedRate = rawRate;
  } else if (Array.isArray(inputs.gaps) && inputs.gaps.length > 0) {
    const liqAbs = Math.abs(liqDist);
    const breached = inputs.gaps.filter((g) => {
      if (typeof g.pct !== 'number' || !Number.isFinite(g.pct)) return false;
      if (direction === 'short') {
        return g.pct >= liqAbs;
      }
      return g.pct <= -liqAbs;
    });
    resolvedRate = breached.length / inputs.gaps.length;
  } else {
    const liqAbs = Math.abs(liqDist);
    const gapAbs = Math.abs(worstGap);
    if (gapAbs >= liqAbs) {
      resolvedRate = 1 / sampleSize;
    } else {
      resolvedRate = 0;
    }
  }

  const liqAbs = Math.abs(liqDist);
  const gapAbs = Math.abs(worstGap);

  const isBreached =
    typeof rawRate === 'number' && Number.isFinite(rawRate)
      ? rawRate > 0
      : (resolvedRate !== null && resolvedRate > 0) || gapAbs >= liqAbs;

  // Case 2: Observed history includes outcomes through the proposed liquidation distance
  if (isBreached) {
    const facts: string[] = [
      `Liquidation distance is ${formatSignedPct(liqDist, 1)} from entry price.`,
      `Worst observed historical weekend gap was ${formatSignedPct(worstGap, 1)}.`,
    ];
    if (resolvedRate !== null && resolvedRate > 0) {
      facts.push(
        `Historical gap-through-liquidation rate: ${formatRate(resolvedRate)} across sample.`
      );
    }
    facts.push(
      `Historical sample: ${sampleSize.toLocaleString()} observed Friday-to-Monday episodes.`
    );
    if (typeof fundingCarry === 'number' && Number.isFinite(fundingCarry)) {
      facts.push(
        `Estimated funding carry over 60h window: ${formatSignedPct(fundingCarry, 2)}.`
      );
    }
    facts.push(
      'Past weekend distributions show tail risk that can eliminate margin during market closure.'
    );

    return {
      headline: 'Historical sample includes liquidation breaches',
      summary:
        'The historical sample includes outcomes through the proposed liquidation distance.',
      code: 'HISTORY_BREACHED_LIQUIDATION',
      state: 'breached',
      isComplete: true,
      supportingFacts: facts,
      inputs: {
        liquidationDistancePct: liqDist,
        worstGapPct: worstGap,
        gapThroughLiquidationRate: resolvedRate,
        fundingCarryPct:
          typeof fundingCarry === 'number' && Number.isFinite(fundingCarry)
            ? fundingCarry
            : null,
        sampleSize,
      },
      provenanceLabel: 'computed' as EvidenceLabel,
    };
  }

  // Case 3: Observed history did not reach the liquidation line
  const facts: string[] = [
    `Liquidation distance is ${formatSignedPct(liqDist, 1)} from entry price.`,
    `Worst observed historical weekend gap was ${formatSignedPct(worstGap, 1)}.`,
  ];
  if (resolvedRate !== null) {
    facts.push(
      `Gap-through-liquidation rate: ${formatRate(resolvedRate)} in observed sample.`
    );
  }
  facts.push(
    `Historical sample: ${sampleSize.toLocaleString()} observed Friday-to-Monday episodes.`
  );
  if (typeof fundingCarry === 'number' && Number.isFinite(fundingCarry)) {
    facts.push(
      `Estimated funding carry over 60h window: ${formatSignedPct(fundingCarry, 2)}.`
    );
  }
  facts.push(
    'Historical observations are not guarantees and the tail remains material.'
  );

  return {
    headline: 'Observed history did not reach liquidation line',
    summary:
      'Observed history did not reach the current liquidation line, but the tail remains material.',
    code: 'HISTORY_WITHIN_LIQUIDATION',
    state: 'within_buffer',
    isComplete: true,
    supportingFacts: facts,
    inputs: {
      liquidationDistancePct: liqDist,
      worstGapPct: worstGap,
      gapThroughLiquidationRate: resolvedRate,
      fundingCarryPct:
        typeof fundingCarry === 'number' && Number.isFinite(fundingCarry)
          ? fundingCarry
          : null,
      sampleSize,
    },
    provenanceLabel: 'computed' as EvidenceLabel,
  };
}

export const computeRiskInterpretation = interpretRisk;

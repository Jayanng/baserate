/**
 * BaseRate Dossier Builder
 * Deterministic assembly of stress-test dossier from market observations and parsed trade.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Fail-closed refusal handling (no fabrication of missing data)
 */

import {
  type Dossier,
  type DossierRisks,
  type EvidenceItem,
  type EvidenceNumber,
  type ParsedTrade,
  type RefusalState,
  type WeekendGapObservation,
} from '../domain/types';
import { makeEvidence, utcNowIso } from '../domain/provenance';
import { classifyRegime, MIN_REGIME_CANDLES } from './regime-classifier';
import {
  computeLiquidationDistance,
  computeFundingCarry,
  computeWorstGap,
} from './risk-engine';
import { computeDistribution } from './base-rate';
import { interpretRisk } from './risk-interpretation';

export const DEFAULT_WEEKEND_HOLDING_HOURS = 60; // Friday close to Monday reopen

export interface BuildDossierParams {
  parsed: ParsedTrade;
  spotPrice: number;
  fundingRate: number | null;
  gaps: WeekendGapObservation[];
  nativeCandles: Array<{ close: number; tsMs: number }>;
}

/**
 * Assembles a complete deterministic stress-test Dossier.
 *
 * Process:
 * 1. Validates critical inputs; records refusal state if data is missing/insufficient
 * 2. Classifies regime deterministically from native daily candles
 * 3. Computes liquidation distance using spot price as entry
 * 4. Computes funding carry over holding window if funding rate is available
 * 5. Computes worst historical weekend gap
 * 6. Computes historical outcome distribution from weekend gaps
 * 7. Assembles complete provenance chain with observed and computed evidence labels
 */
export function buildDossier(params: {
  parsed: ParsedTrade;
  spotPrice: number;
  fundingRate: number | null;
  gaps: WeekendGapObservation[];
  nativeCandles: Array<{ close: number; tsMs: number }>;
}): Dossier {
  const { parsed, spotPrice, fundingRate, gaps, nativeCandles } = params;
  const provenance: EvidenceItem[] = [];

  // Determine refusal state for missing critical inputs
  let refusal: RefusalState | null = null;

  if (
    typeof spotPrice !== 'number' ||
    !Number.isFinite(spotPrice) ||
    spotPrice <= 0
  ) {
    refusal = {
      code: 'UNAVAILABLE',
      reason: 'Spot price is unavailable or non-positive',
    };
  } else if (!nativeCandles || nativeCandles.length < MIN_REGIME_CANDLES) {
    refusal = {
      code: 'INSUFFICIENT_EVIDENCE',
      reason: `Insufficient candle history for regime classification (${nativeCandles ? nativeCandles.length : 0} observed, minimum ${MIN_REGIME_CANDLES} required)`,
    };
  }

  // Record observed spot price in provenance
  if (typeof spotPrice === 'number' && Number.isFinite(spotPrice)) {
    provenance.push(
      makeEvidence(
        'observed',
        'bitget_spot',
        utcNowIso(),
        `Bitget spot tape entry price: ${spotPrice}`
      )
    );
  }

  // 1. Liquidation distance
  let liquidationDistancePct: EvidenceNumber | null = null;
  if (
    typeof spotPrice === 'number' &&
    Number.isFinite(spotPrice) &&
    spotPrice > 0 &&
    parsed.leverage > 1
  ) {
    try {
      const distance = computeLiquidationDistance(
        spotPrice,
        parsed.leverage,
        parsed.direction
      );
      const liqEvidence = makeEvidence(
        'computed',
        'engine_risk',
        utcNowIso(),
        `Liquidation distance for ${parsed.direction} at ${parsed.leverage}x leverage`
      );
      liquidationDistancePct = {
        value: Number(distance.toFixed(4)),
        evidence: liqEvidence,
      };
      provenance.push(liqEvidence);
    } catch {
      liquidationDistancePct = null;
    }
  } else if (parsed.leverage <= 1 && refusal === null) {
    // Fail-closed: an invalid leverage (<= 1) reaching the engine means validation
    // was bypassed. Record a refusal instead of silently omitting the risk metric.
    refusal = {
      code: 'PARSE_UNCERTAIN',
      reason: `Leverage ${parsed.leverage} is invalid for stress computation (must be > 1)`,
    };
  }

  // 2. Funding carry (default 60h weekend hold)
  let fundingCarryPct: EvidenceNumber | null = null;
  if (
    fundingRate !== null &&
    typeof fundingRate === 'number' &&
    Number.isFinite(fundingRate)
  ) {
    const carry = computeFundingCarry(
      fundingRate,
      DEFAULT_WEEKEND_HOLDING_HOURS
    );
    const carryEvidence = makeEvidence(
      'computed',
      'engine_risk',
      utcNowIso(),
      `Funding carry over ${DEFAULT_WEEKEND_HOLDING_HOURS}h hold at interval rate ${fundingRate}`
    );
    fundingCarryPct = {
      value: Number(carry.toFixed(6)),
      evidence: carryEvidence,
    };
    provenance.push(carryEvidence);
  }

  // 3. Worst gap
  let worstGapPct: EvidenceNumber | null = null;
  const worstGapVal = computeWorstGap(gaps);
  if (worstGapVal !== null) {
    const worstEvidence = makeEvidence(
      'computed',
      'engine_risk',
      utcNowIso(),
      `Worst historical weekend gap from ${gaps.length} observed episodes`
    );
    worstGapPct = {
      value: Number(worstGapVal.toFixed(4)),
      evidence: worstEvidence,
    };
    provenance.push(worstEvidence);
  }

  // 4. Regime classification
  const regime = classifyRegime(nativeCandles);
  const regimeEvidence = makeEvidence(
    'computed',
    'engine_regime',
    utcNowIso(),
    `Deterministic regime classified as ${regime}`
  );
  provenance.push(regimeEvidence);

  // 5. Outcome distribution
  const distribution = computeDistribution(gaps);
  if (distribution !== null) {
    const distEvidence = makeEvidence(
      'computed',
      'engine_base_rate',
      utcNowIso(),
      `Base-rate distribution calculated across ${distribution.sampleSize} episodes`
    );
    provenance.push(distEvidence);
  }

  // 6. Deterministic risk interpretation (Task 6.1)
  const interpretation = interpretRisk({
    liquidationDistancePct: liquidationDistancePct?.value ?? null,
    worstGapPct: worstGapPct?.value ?? null,
    fundingCarryPct: fundingCarryPct?.value ?? null,
    sampleSize: distribution?.sampleSize ?? (gaps ? gaps.length : null),
    direction: parsed.direction,
    refusal,
    gaps,
  });
  const interpEvidence = makeEvidence(
    'computed',
    'engine_risk_interpretation',
    utcNowIso(),
    `Deterministic risk interpretation: ${interpretation.code}`
  );
  provenance.push(interpEvidence);

  const risks: DossierRisks = {
    liquidationDistancePct,
    fundingCarryPct,
    worstGapPct,
  };

  return {
    parsed,
    risks,
    regime,
    distribution,
    refusal,
    provenance,
    interpretation,
  };
}

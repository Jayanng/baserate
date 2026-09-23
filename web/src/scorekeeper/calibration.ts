/**
 * BaseRate Scorekeeper Calibration & Band Adjustment Engine
 * Deterministic band widening and regime reliability scoring based on historical forecast outcomes.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Deterministic arithmetic, not ML retraining
 */

import {
  type CalibrationRecord,
  type CalibrationRegime,
  type CalibrationStatus,
  type ForecastRecord,
  type RegimeTag,
} from '../domain/types';

export interface BandAdjustment {
  regime: RegimeTag;
  oldWidth: number;
  newWidth: number;
  reason: string;
  timestampUtc: string;
}

interface RegimeCounts {
  total: number;
  hits: number;
  misses: number;
  pending: number;
}

/**
 * Computes calibration record grouping forecasts by regime.
 * Assigns reliability status based on sample size and accuracy:
 * - total < 5: 'provisional'
 * - total >= 5 and hit rate >= 70%: 'reliable'
 * - total >= 5 and hit rate < 70%: 'adjusted'
 */
export function computeCalibration(records: ForecastRecord[]): CalibrationRecord {
  let totalOverall = 0;
  let hitsOverall = 0;
  let missesOverall = 0;
  let pendingOverall = 0;

  const regimeMap = new Map<RegimeTag, RegimeCounts>();

  for (const r of records) {
    totalOverall++;
    if (r.status === 'hit') {
      hitsOverall++;
    } else if (r.status === 'miss') {
      missesOverall++;
    } else if (r.status === 'pending') {
      pendingOverall++;
    }

    let counts = regimeMap.get(r.regime);
    if (!counts) {
      counts = { total: 0, hits: 0, misses: 0, pending: 0 };
      regimeMap.set(r.regime, counts);
    }

    counts.total++;
    if (r.status === 'hit') {
      counts.hits++;
    } else if (r.status === 'miss') {
      counts.misses++;
    } else if (r.status === 'pending') {
      counts.pending++;
    }
  }

  const byRegime: CalibrationRegime[] = [];
  for (const [regime, counts] of regimeMap.entries()) {
    let status: CalibrationStatus;
    if (counts.total < 5) {
      status = 'provisional';
    } else if (counts.hits / counts.total >= 0.7) {
      status = 'reliable';
    } else {
      status = 'adjusted';
    }

    byRegime.push({
      regime,
      total: counts.total,
      hits: counts.hits,
      status,
    });
  }

  return {
    total: totalOverall,
    hits: hitsOverall,
    misses: missesOverall,
    pending: pendingOverall,
    byRegime,
  };
}

/**
 * Computes deterministic band adjustments for regimes with 'adjusted' status.
 * Widens band by missCount * 0.5 percentage points (capped at max 5pp widening).
 * Regimes with 'reliable' or 'provisional' status receive no adjustment.
 */
export function computeBandAdjustments(
  records: ForecastRecord[],
  currentBandWidths: Record<RegimeTag, number>
): BandAdjustment[] {
  const calibration = computeCalibration(records);
  const adjustments: BandAdjustment[] = [];

  for (const reg of calibration.byRegime) {
    if (reg.status === 'adjusted') {
      const misses = records.filter(
        (r) => r.regime === reg.regime && r.status === 'miss'
      ).length;
      const widening = Math.min(misses * 0.5, 5.0);
      const oldWidth = currentBandWidths[reg.regime];
      const newWidth = oldWidth + widening;
      const timestampUtc = new Date().toISOString();
      const hitPct = ((reg.hits / reg.total) * 100).toFixed(1);
      const reason = `Regime ${reg.regime} underperforming: ${misses} misses out of ${reg.total} forecasts (${hitPct}% hit rate < 70%). Widening band by ${widening.toFixed(1)}pp.`;

      adjustments.push({
        regime: reg.regime,
        oldWidth,
        newWidth,
        reason,
        timestampUtc,
      });
    }
  }

  return adjustments;
}

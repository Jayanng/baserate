/**
 * BaseRate Scorekeeper Grader Logic
 * Evaluates pending forecasts against actual Monday market outcomes.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Immutable records: does not mutate inputs or registry
 */

import { type ForecastRecord } from '../domain/types';
import { getPendingForecasts } from './registry';

/**
 * Monday grading logic. Compares actual outcome to predicted band.
 * Returns a new ForecastRecord object without mutating input or registry.
 */
export function gradeForecast(record: ForecastRecord, actualOutcomePct: number): ForecastRecord {
  const isHit = actualOutcomePct >= record.bandLowPct && actualOutcomePct <= record.bandHighPct;
  return {
    ...record,
    status: isHit ? 'hit' : 'miss',
  };
}

/**
 * Grades all pending forecasts from the registry whose tradeHash is present in actualOutcomes.
 * Returns array of graded results without modifying the registry.
 */
export function gradeAllPending(
  actualOutcomes: Map<string, number>
): Array<{ record: ForecastRecord; result: 'hit' | 'miss' }> {
  const pending = getPendingForecasts();
  const gradedResults: Array<{ record: ForecastRecord; result: 'hit' | 'miss' }> = [];

  for (const record of pending) {
    const outcome = actualOutcomes.get(record.tradeHash);
    if (outcome !== undefined) {
      const graded = gradeForecast(record, outcome);
      gradedResults.push({
        record: graded,
        result: graded.status === 'hit' ? 'hit' : 'miss',
      });
    }
  }

  return gradedResults;
}

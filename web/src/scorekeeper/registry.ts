/**
 * BaseRate Scorekeeper Forecast Registry
 * Append-only in-memory registry for forecast records before Monday grading.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects outside module-level registry
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 */

import { type ForecastRecord, type RegimeTag } from '../domain/types';
import { hashString } from '../domain/provenance';

export interface RegisterForecastParams {
  tradeHash: string;
  bandLowPct: number;
  bandHighPct: number;
  regime: RegimeTag;
  mode: 'live' | 'replay';
}

let registry: ForecastRecord[] = [];

/**
 * Registers an issued forecast in the append-only registry with pending status.
 */
export function registerForecast(params: {
  tradeHash: string;
  bandLowPct: number;
  bandHighPct: number;
  regime: RegimeTag;
  mode: 'live' | 'replay';
}): ForecastRecord {
  const record: ForecastRecord = {
    id: hashString(params.tradeHash + Date.now().toString()),
    issuedAtUtc: new Date().toISOString(),
    tradeHash: params.tradeHash,
    bandLowPct: params.bandLowPct,
    bandHighPct: params.bandHighPct,
    regime: params.regime,
    status: 'pending',
    mode: params.mode,
  };

  registry.push(record);
  return record;
}

/**
 * Returns all records currently in 'pending' status.
 */
export function getPendingForecasts(): ForecastRecord[] {
  return registry.filter((r) => r.status === 'pending');
}

/**
 * Returns a shallow copy of the entire internal registry.
 */
export function getAllForecasts(): ForecastRecord[] {
  return [...registry];
}

/**
 * Resets internal registry array to empty (for test isolation only).
 */
export function clearRegistry(): void {
  registry = [];
}

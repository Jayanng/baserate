/**
 * BaseRate Replay Fixtures Accessor
 * Strictly typed runtime accessors for real historical replay data computed from Yahoo Finance native history.
 *
 * Rules:
 * - Pure data accessors, zero network calls, zero mutations
 * - Strictly typed against domain contracts
 * - Replaces hand-asserted numbers with real computed history
 */

import replayNVDA from '../../fixtures/replay-NVDA.json';
import replayTSLA from '../../fixtures/replay-TSLA.json';
import replayAAPL from '../../fixtures/replay-AAPL.json';
import replayQQQ from '../../fixtures/replay-QQQ.json';
import replayMSTR from '../../fixtures/replay-MSTR.json';

import type {
  RegimeTag,
  OutcomeDistribution,
  ForecastRecord,
  CalibrationRecord,
  WeekendGapObservation,
} from '../domain/types';
import type { LedgerEntry } from '../scorekeeper/ledger';
import type { BandAdjustment } from '../scorekeeper/calibration';

export type ReplayAsset = 'rNVDA' | 'rTSLA' | 'rAAPL' | 'rQQQ' | 'rMSTR';

export interface ReplayGapEpisode extends WeekendGapObservation {
  regime: RegimeTag;
}

export interface ReplayStats {
  totalEpisodes: number;
  closedUpCount: number;
  closedUpPct: number;
  survivedWorstGapCount: number;
  survivedWorstGapPct: number;
  medianPct: number;
  worstPct: number;
  worstDate: string;
  regimeCounts: Record<string, number>;
}

export interface ReplayLedgerData {
  entries: LedgerEntry[];
  verified: boolean;
}

export interface ReplayDataset {
  generatedAtUtc: string;
  source: string;
  totalEpisodes: number;
  gaps: ReplayGapEpisode[];
  distribution: OutcomeDistribution;
  replayForecasts: ForecastRecord[];
  calibration: CalibrationRecord;
  bandAdjustments: BandAdjustment[];
  ledger: ReplayLedgerData;
  stats: ReplayStats;
}

const REPLAY_DATASETS: Record<ReplayAsset, ReplayDataset> = {
  rNVDA: replayNVDA as unknown as ReplayDataset,
  rTSLA: replayTSLA as unknown as ReplayDataset,
  rAAPL: replayAAPL as unknown as ReplayDataset,
  rQQQ: replayQQQ as unknown as ReplayDataset,
  rMSTR: replayMSTR as unknown as ReplayDataset,
};

export const REPLAY_META = {
  generatedAtUtc: replayNVDA.generatedAtUtc,
  source: replayNVDA.source,
} as const;

/**
 * Returns the full typed dataset for the requested asset (defaults to rNVDA).
 */
export function getReplayData(asset: ReplayAsset = 'rNVDA'): ReplayDataset {
  return REPLAY_DATASETS[asset] ?? REPLAY_DATASETS.rNVDA;
}

/**
 * Returns all historical weekend gap episodes with their classified regime for the specified asset.
 */
export function getReplayGaps(asset: ReplayAsset = 'rNVDA'): ReplayGapEpisode[] {
  return getReplayData(asset).gaps;
}

/**
 * Returns the deterministic historical base-rate outcome distribution for the specified asset.
 */
export function getReplayDistribution(asset: ReplayAsset = 'rNVDA'): OutcomeDistribution {
  return getReplayData(asset).distribution;
}

/**
 * Returns historical replay forecast records for the specified asset.
 */
export function getReplayForecasts(asset: ReplayAsset = 'rNVDA'): ForecastRecord[] {
  return getReplayData(asset).replayForecasts;
}

/**
 * Returns the calibration record computed from replay forecasts for the specified asset.
 */
export function getReplayCalibration(asset: ReplayAsset = 'rNVDA'): CalibrationRecord {
  return getReplayData(asset).calibration;
}

/**
 * Returns deterministic band adjustments resulting from calibration evaluation for the specified asset.
 */
export function getReplayBandAdjustments(asset: ReplayAsset = 'rNVDA'): BandAdjustment[] {
  return getReplayData(asset).bandAdjustments;
}

/**
 * Returns the cryptographic hash-chained ledger and its verification status for the specified asset.
 */
export function getReplayLedger(asset: ReplayAsset = 'rNVDA'): ReplayLedgerData {
  return getReplayData(asset).ledger;
}

/**
 * Returns aggregate statistical metrics derived from the complete episode pool for the specified asset.
 */
export function getReplayStats(asset: ReplayAsset = 'rNVDA'): ReplayStats {
  return getReplayData(asset).stats;
}

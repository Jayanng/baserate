import { type ForecastRecord, type CalibrationRecord } from '@/src/domain/types';
import { type BandAdjustment } from '@/src/scorekeeper/calibration';
import {
  getReplayForecasts,
  getReplayCalibration,
  getReplayBandAdjustments,
} from '@/src/data/replay-fixtures';

/**
 * Real historical replay forecast records for the Scorecard page.
 * 12 records derived from real Yahoo Finance NVDA history across regimes,
 * including historical worst gap and gap-thru-liq miss examples.
 * Desk-reference dataset: rNVDA (represents the desk's registered replay track record).
 */
export const FIXTURE_FORECAST_RECORDS: ForecastRecord[] = getReplayForecasts('rNVDA');

/**
 * Alias for FIXTURE_FORECAST_RECORDS to satisfy both naming conventions.
 */
export const FIXTURE_FORECASTS: ForecastRecord[] = FIXTURE_FORECAST_RECORDS;

/**
 * Calibration record computed from the real replay forecasts (desk-reference: rNVDA).
 */
export const FIXTURE_CALIBRATION: CalibrationRecord = getReplayCalibration('rNVDA');

/**
 * Deterministic band adjustments resulting from calibration evaluation (desk-reference: rNVDA).
 */
export const FIXTURE_BAND_ADJUSTMENTS: BandAdjustment[] = getReplayBandAdjustments('rNVDA');

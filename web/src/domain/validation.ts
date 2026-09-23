/**
 * BaseRate Domain Validation
 * Pure validation functions and guards.
 *
 * Rules:
 * - Fail-closed: Never coerce missing or invalid values to 0.
 * - Pure functions: No side effects, no network, no file IO.
 * - Zero any, zero non-null assertions.
 */

import {
  type ParsedTrade,
  type RefusalState,
  type EvidenceLabel,
  type Result,
  ok,
  err,
} from './types';

const VALID_EVIDENCE_LABELS: readonly EvidenceLabel[] = [
  'observed',
  'estimated',
  'target',
  'replay',
  'computed',
] as const;

/**
 * Type guard for EvidenceItem label values.
 */
export function isEvidenceStatus(status: unknown): status is EvidenceLabel {
  return typeof status === 'string' && (VALID_EVIDENCE_LABELS as readonly string[]).includes(status);
}

/**
 * Ensures a financial input is strictly positive (> 0) and finite.
 * Throws on 0, negative values, NaN, or non-finite inputs.
 * Fail-closed: Never coerces to zero or default values.
 */
export function rejectZeros(input: number, fieldName?: string): number {
  const prefix = fieldName ? `Field '${fieldName}'` : 'Financial input';
  if (typeof input !== 'number' || Number.isNaN(input) || !Number.isFinite(input)) {
    throw new Error(`${prefix} must be a finite number (received ${String(input)})`);
  }
  if (input <= 0) {
    throw new Error(`${prefix} must be strictly positive and non-zero (received ${input})`);
  }
  return input;
}

/**
 * Validates an unknown input against the ParsedTrade contract.
 * Rejects negative/zero sizeUsdt, leverage < 1 or > 25, empty asset, and unknown direction.
 */
export function validateParsedTrade(p: unknown): Result<ParsedTrade, RefusalState> {
  if (typeof p !== 'object' || p === null || Array.isArray(p)) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: 'Trade payload must be a non-null object',
    });
  }

  const record = p as Record<string, unknown>;

  // Asset validation
  if (typeof record.asset !== 'string' || record.asset.trim().length === 0) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: 'Trade asset cannot be empty',
    });
  }
  const asset = record.asset.trim();

  // rTokenSymbol validation
  if (typeof record.rTokenSymbol !== 'string' || record.rTokenSymbol.trim().length === 0) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: 'rTokenSymbol cannot be empty',
    });
  }
  const rTokenSymbol = record.rTokenSymbol.trim();

  // perpSymbol validation
  if (typeof record.perpSymbol !== 'string' || record.perpSymbol.trim().length === 0) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: 'perpSymbol cannot be empty',
    });
  }
  const perpSymbol = record.perpSymbol.trim();

  // Direction validation
  if (record.direction !== 'long' && record.direction !== 'short') {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `Unknown trade direction '${String(record.direction)}' (expected 'long' or 'short')`,
    });
  }
  const direction = record.direction;

  // sizeUsdt validation (must be > 0 and finite)
  if (
    typeof record.sizeUsdt !== 'number' ||
    Number.isNaN(record.sizeUsdt) ||
    !Number.isFinite(record.sizeUsdt) ||
    record.sizeUsdt <= 0
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `sizeUsdt must be strictly positive (received ${String(record.sizeUsdt)})`,
    });
  }
  const sizeUsdt = record.sizeUsdt;

  // Leverage validation (1 <= leverage <= 25)
  if (
    typeof record.leverage !== 'number' ||
    Number.isNaN(record.leverage) ||
    !Number.isFinite(record.leverage) ||
    record.leverage < 1 ||
    record.leverage > 25
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `leverage must be between 1 and 25 (received ${String(record.leverage)})`,
    });
  }
  const leverage = record.leverage;

  // Entry timing validation
  const validEntryTimings = ['friday_close', 'monday_open', 'custom'] as const;
  if (
    typeof record.entryTiming !== 'string' ||
    !(validEntryTimings as readonly string[]).includes(record.entryTiming)
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `Invalid entryTiming '${String(record.entryTiming)}'`,
    });
  }
  const entryTiming = record.entryTiming as (typeof validEntryTimings)[number];

  // Holding window validation
  const validHoldingWindows = ['weekend', 'custom'] as const;
  if (
    typeof record.holdingWindow !== 'string' ||
    !(validHoldingWindows as readonly string[]).includes(record.holdingWindow)
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `Invalid holdingWindow '${String(record.holdingWindow)}'`,
    });
  }
  const holdingWindow = record.holdingWindow as (typeof validHoldingWindows)[number];

  // Collateral validation
  const validCollaterals = ['usdt', 'crypto'] as const;
  if (
    typeof record.collateral !== 'string' ||
    !(validCollaterals as readonly string[]).includes(record.collateral)
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `Invalid collateral '${String(record.collateral)}'`,
    });
  }
  const collateral = record.collateral as (typeof validCollaterals)[number];

  // Evidence validation
  const validEvidence = ['parsed', 'uncertain'] as const;
  if (
    typeof record.evidence !== 'string' ||
    !(validEvidence as readonly string[]).includes(record.evidence)
  ) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: `Invalid evidence status '${String(record.evidence)}'`,
    });
  }
  const evidence = record.evidence as (typeof validEvidence)[number];

  return ok({
    asset,
    rTokenSymbol,
    perpSymbol,
    direction,
    sizeUsdt,
    leverage,
    entryTiming,
    holdingWindow,
    collateral,
    evidence,
  });
}

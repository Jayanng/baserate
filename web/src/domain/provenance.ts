/**
 * BaseRate Provenance & Hashing Helpers
 * Utilities for evidence tracking, timestamps, and stable hashing.
 *
 * Rules:
 * - Pure functions with zero any and zero non-null assertions.
 * - Deterministic cross-platform hashing (FNV-1a 32-bit hex).
 * - No file IO or external network calls.
 */

import { type EvidenceItem, type EvidenceLabel, type ParsedTrade } from './types';

/**
 * Constructs a typed EvidenceItem tracking the provenance of data points or calculations.
 */
export function makeEvidence(
  label: EvidenceLabel,
  source: string,
  timestampUtc: string | null,
  note?: string
): EvidenceItem {
  return {
    label,
    source,
    timestampUtc,
    ...(note !== undefined ? { note } : {}),
  };
}

/**
 * Returns current UTC timestamp in ISO-8601 format.
 */
export function utcNowIso(): string {
  return new Date().toISOString();
}

/**
 * Stable 32-bit FNV-1a hash returning an 8-character lowercase hexadecimal string.
 * Used for deterministic tradeHash and record identifiers without native crypto dependencies.
 */
export function hashString(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Produces a stable deterministic hash for a ParsedTrade contract.
 */
export function hashTrade(trade: ParsedTrade): string {
  const payload = [
    trade.asset,
    trade.rTokenSymbol,
    trade.perpSymbol,
    trade.direction,
    trade.sizeUsdt,
    trade.leverage,
    trade.entryTiming,
    trade.holdingWindow,
    trade.collateral,
  ].join('|');
  return hashString(payload);
}

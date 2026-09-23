/**
 * BaseRate Scorekeeper Cryptographic Ledger
 * Append-only ledger with cryptographic hash chaining for immutable forecast integrity.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO network calls, NO React/Next imports, NO any, NO non-null assertions
 * - Hash-chain verification from GENESIS state
 */

import { hashString } from '../domain/provenance';

export interface LedgerEntry {
  index: number;
  forecastId: string;
  grade: 'hit' | 'miss' | 'pending';
  previousHash: string;
  entryHash: string;
}

/**
 * Appends a new entry to the immutable ledger array.
 * Derives previousHash from previous entry (or 'GENESIS' if empty).
 * Computes deterministic entryHash linking previous hash, forecast ID, grade, and index.
 * Returns a new array leaving the input unmodified.
 */
export function appendToLedger(
  entries: LedgerEntry[],
  forecastId: string,
  grade: 'hit' | 'miss' | 'pending'
): LedgerEntry[] {
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : undefined;
  const previousHash = lastEntry !== undefined ? lastEntry.entryHash : 'GENESIS';
  const index = entries.length;
  const entryHash = hashString(previousHash + forecastId + grade + index.toString());

  const newEntry: LedgerEntry = {
    index,
    forecastId,
    grade,
    previousHash,
    entryHash,
  };

  return [...entries, newEntry];
}

/**
 * Verifies the integrity of the ledger by replaying the hash chain from GENESIS.
 * Returns true if every entry matches its computed hash and chains correctly; false otherwise.
 */
export function verifyLedgerIntegrity(entries: LedgerEntry[]): boolean {
  let expectedPreviousHash = 'GENESIS';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry === undefined) {
      return false;
    }

    if (entry.index !== i) {
      return false;
    }

    if (entry.previousHash !== expectedPreviousHash) {
      return false;
    }

    const recomputedHash = hashString(
      entry.previousHash + entry.forecastId + entry.grade + entry.index.toString()
    );

    if (entry.entryHash !== recomputedHash) {
      return false;
    }

    expectedPreviousHash = entry.entryHash;
  }

  return true;
}

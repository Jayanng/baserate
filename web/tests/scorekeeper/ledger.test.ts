import { describe, it, expect } from 'vitest';
import {
  appendToLedger,
  verifyLedgerIntegrity,
  type LedgerEntry,
} from '@/src/scorekeeper/ledger';

describe('scorekeeper ledger', () => {
  it("first entry has previousHash='GENESIS'", () => {
    const ledger = appendToLedger([], 'forecast_1', 'pending');

    expect(ledger.length).toBe(1);
    const entry = ledger[0];
    expect(entry?.index).toBe(0);
    expect(entry?.forecastId).toBe('forecast_1');
    expect(entry?.grade).toBe('pending');
    expect(entry?.previousHash).toBe('GENESIS');
    expect(typeof entry?.entryHash).toBe('string');
    expect(entry?.entryHash.length).toBeGreaterThan(0);
  });

  it('second entry chains from first', () => {
    const l1 = appendToLedger([], 'forecast_1', 'hit');
    const l2 = appendToLedger(l1, 'forecast_2', 'miss');

    expect(l2.length).toBe(2);
    const first = l2[0];
    const second = l2[1];

    expect(first?.index).toBe(0);
    expect(second?.index).toBe(1);
    expect(second?.previousHash).toBe(first?.entryHash);
    expect(second?.forecastId).toBe('forecast_2');
    expect(second?.grade).toBe('miss');
  });

  it('verifyLedgerIntegrity returns true for valid chain', () => {
    let ledger: LedgerEntry[] = [];
    ledger = appendToLedger(ledger, 'f_1', 'pending');
    ledger = appendToLedger(ledger, 'f_2', 'hit');
    ledger = appendToLedger(ledger, 'f_3', 'miss');

    expect(verifyLedgerIntegrity(ledger)).toBe(true);
    expect(verifyLedgerIntegrity([])).toBe(true);
  });

  it('tampering an entry causes verify to return false', () => {
    let ledger: LedgerEntry[] = [];
    ledger = appendToLedger(ledger, 'f_1', 'hit');
    ledger = appendToLedger(ledger, 'f_2', 'miss');
    ledger = appendToLedger(ledger, 'f_3', 'hit');

    expect(verifyLedgerIntegrity(ledger)).toBe(true);

    const [e0, e1, e2] = ledger;
    if (!e0 || !e1 || !e2) {
      throw new Error('Expected 3 ledger entries');
    }

    // Tampering grade
    const tamperedGrade: LedgerEntry[] = [
      { ...e0, grade: 'miss' },
      e1,
      e2,
    ];
    expect(verifyLedgerIntegrity(tamperedGrade)).toBe(false);

    // Tampering forecastId
    const tamperedId: LedgerEntry[] = [
      e0,
      { ...e1, forecastId: 'f_hacked' },
      e2,
    ];
    expect(verifyLedgerIntegrity(tamperedId)).toBe(false);

    // Tampering previousHash
    const tamperedPrev: LedgerEntry[] = [
      e0,
      { ...e1, previousHash: 'forged_hash' },
      e2,
    ];
    expect(verifyLedgerIntegrity(tamperedPrev)).toBe(false);

    // Tampering entryHash
    const tamperedHash: LedgerEntry[] = [
      e0,
      e1,
      { ...e2, entryHash: 'deadbeef' },
    ];
    expect(verifyLedgerIntegrity(tamperedHash)).toBe(false);
  });

  it('appendToLedger returns new array (original unchanged)', () => {
    const original: LedgerEntry[] = [];
    const frozenOriginal = Object.freeze(original) as LedgerEntry[];

    const updated = appendToLedger(frozenOriginal, 'f_alpha', 'pending');

    expect(updated).not.toBe(frozenOriginal);
    expect(frozenOriginal.length).toBe(0);
    expect(updated.length).toBe(1);
  });
});

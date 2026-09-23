import { describe, it, expect } from 'vitest';
import {
  hashString,
  hashTrade,
  makeEvidence,
  utcNowIso,
} from '@/src/domain/provenance';
import type { ParsedTrade } from '@/src/domain/types';

describe('provenance', () => {
  describe('hashString', () => {
    it('produces identical hash for identical input (stability)', () => {
      const input = 'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.';
      const hash1 = hashString(input);
      const hash2 = hashString(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{8}$/);
    });

    it('produces different hashes for different inputs', () => {
      const hashA = hashString('long rNVDA');
      const hashB = hashString('short rNVDA');
      const hashC = hashString('long rTSLA');

      expect(hashA).not.toBe(hashB);
      expect(hashA).not.toBe(hashC);
      expect(hashB).not.toBe(hashC);
    });

    it('handles empty strings and edge characters deterministically', () => {
      const emptyHash = hashString('');
      expect(emptyHash).toBe('811c9dc5'); // FNV-1a 32-bit initial offset basis in hex

      const unicodeHash1 = hashString('trade-🚀-2026');
      const unicodeHash2 = hashString('trade-🚀-2026');
      expect(unicodeHash1).toBe(unicodeHash2);
    });
  });

  describe('hashTrade', () => {
    const tradeA: ParsedTrade = {
      asset: 'rNVDA',
      rTokenSymbol: 'RNVDAUSDT',
      perpSymbol: 'NVDAUSDT',
      direction: 'long',
      sizeUsdt: 5000,
      leverage: 3,
      entryTiming: 'friday_close',
      holdingWindow: 'weekend',
      collateral: 'usdt',
      evidence: 'parsed',
    };

    const tradeB: ParsedTrade = {
      ...tradeA,
      leverage: 5,
    };

    it('produces stable hash for the same trade', () => {
      expect(hashTrade(tradeA)).toBe(hashTrade({ ...tradeA }));
    });

    it('produces different hash when trade parameters differ', () => {
      expect(hashTrade(tradeA)).not.toBe(hashTrade(tradeB));
    });
  });

  describe('makeEvidence', () => {
    it('creates an EvidenceItem with note', () => {
      const item = makeEvidence(
        'observed',
        'bitget_mix',
        '2026-09-23T00:00:00.000Z',
        'Direct Bitget funding endpoint'
      );

      expect(item).toEqual({
        label: 'observed',
        source: 'bitget_mix',
        timestampUtc: '2026-09-23T00:00:00.000Z',
        note: 'Direct Bitget funding endpoint',
      });
    });

    it('creates an EvidenceItem without note when omitted', () => {
      const item = makeEvidence('computed', 'risk_engine', null);

      expect(item).toEqual({
        label: 'computed',
        source: 'risk_engine',
        timestampUtc: null,
      });
      expect('note' in item).toBe(false);
    });
  });

  describe('utcNowIso', () => {
    it('returns a valid ISO-8601 UTC timestamp', () => {
      const now = utcNowIso();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const parsedDate = new Date(now);
      expect(Number.isNaN(parsedDate.getTime())).toBe(false);
    });
  });
});

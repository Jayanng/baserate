import { describe, it, expect } from 'vitest';
import {
  validateParsedTrade,
  rejectZeros,
  isEvidenceStatus,
} from '@/src/domain/validation';
import type { ParsedTrade } from '@/src/domain/types';

describe('validation', () => {
  const validTrade: ParsedTrade = {
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

  describe('validateParsedTrade', () => {
    it('passes for a valid parsed trade', () => {
      const result = validateParsedTrade(validTrade);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual(validTrade);
    });

    it('rejects zero sizeUsdt', () => {
      const invalid = { ...validTrade, sizeUsdt: 0 };
      const result = validateParsedTrade(invalid);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('PARSE_UNCERTAIN');
      expect(result.error.reason).toContain('sizeUsdt must be strictly positive');
    });

    it('rejects negative sizeUsdt', () => {
      const invalid = { ...validTrade, sizeUsdt: -500 };
      const result = validateParsedTrade(invalid);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('PARSE_UNCERTAIN');
      expect(result.error.reason).toContain('sizeUsdt must be strictly positive');
    });

    it('rejects leverage < 1 (e.g. 0.5)', () => {
      const invalid = { ...validTrade, leverage: 0.5 };
      const result = validateParsedTrade(invalid);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('PARSE_UNCERTAIN');
      expect(result.error.reason).toContain('leverage must be between 1 and 25');
    });

    it('rejects leverage > 25 (e.g. 30)', () => {
      const invalid = { ...validTrade, leverage: 30 };
      const result = validateParsedTrade(invalid);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('PARSE_UNCERTAIN');
      expect(result.error.reason).toContain('leverage must be between 1 and 25');
    });

    it('allows boundary leverage values (1 and 25)', () => {
      const lev1 = { ...validTrade, leverage: 1 };
      const res1 = validateParsedTrade(lev1);
      expect(res1.ok).toBe(true);

      const lev25 = { ...validTrade, leverage: 25 };
      const res25 = validateParsedTrade(lev25);
      expect(res25.ok).toBe(true);
    });

    it('rejects empty or whitespace asset', () => {
      const invalidEmpty = { ...validTrade, asset: '' };
      const resEmpty = validateParsedTrade(invalidEmpty);
      expect(resEmpty.ok).toBe(false);
      if (resEmpty.ok) return;
      expect(resEmpty.error.reason).toContain('Trade asset cannot be empty');

      const invalidWhitespace = { ...validTrade, asset: '   ' };
      const resWhitespace = validateParsedTrade(invalidWhitespace);
      expect(resWhitespace.ok).toBe(false);
    });

    it('rejects unknown direction', () => {
      const invalid = { ...validTrade, direction: 'sideways' };
      const result = validateParsedTrade(invalid);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.reason).toContain("Unknown trade direction 'sideways'");
    });

    it('rejects non-object or null input', () => {
      expect(validateParsedTrade(null).ok).toBe(false);
      expect(validateParsedTrade(undefined).ok).toBe(false);
      expect(validateParsedTrade('string').ok).toBe(false);
      expect(validateParsedTrade([1, 2, 3]).ok).toBe(false);
    });
  });

  describe('rejectZeros', () => {
    it('returns positive finite numbers unchanged', () => {
      expect(rejectZeros(100)).toBe(100);
      expect(rejectZeros(0.0001)).toBe(0.0001);
      expect(rejectZeros(5000, 'marginSize')).toBe(5000);
    });

    it('throws on zero', () => {
      expect(() => rejectZeros(0)).toThrow('must be strictly positive and non-zero');
      expect(() => rejectZeros(0, 'collateral')).toThrow("Field 'collateral' must be strictly positive and non-zero");
    });

    it('throws on negative numbers', () => {
      expect(() => rejectZeros(-1)).toThrow('must be strictly positive and non-zero');
      expect(() => rejectZeros(-500.5, 'balance')).toThrow("Field 'balance' must be strictly positive and non-zero");
    });

    it('throws on NaN and infinite values', () => {
      expect(() => rejectZeros(NaN)).toThrow('must be a finite number');
      expect(() => rejectZeros(Infinity)).toThrow('must be a finite number');
      expect(() => rejectZeros(-Infinity)).toThrow('must be a finite number');
    });
  });

  describe('isEvidenceStatus', () => {
    it('accepts valid evidence status labels', () => {
      expect(isEvidenceStatus('observed')).toBe(true);
      expect(isEvidenceStatus('estimated')).toBe(true);
      expect(isEvidenceStatus('target')).toBe(true);
      expect(isEvidenceStatus('replay')).toBe(true);
      expect(isEvidenceStatus('computed')).toBe(true);
    });

    it('rejects invalid or arbitrary strings and non-strings', () => {
      expect(isEvidenceStatus('fabricated')).toBe(false);
      expect(isEvidenceStatus('live')).toBe(false);
      expect(isEvidenceStatus('')).toBe(false);
      expect(isEvidenceStatus(null)).toBe(false);
      expect(isEvidenceStatus(undefined)).toBe(false);
      expect(isEvidenceStatus(123)).toBe(false);
    });
  });
});

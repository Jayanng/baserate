import { describe, it, expect } from 'vitest';
import { parseTradeIntent } from '@/src/domain/trade-parser';

describe('trade-parser', () => {
  it('parses golden input correctly', () => {
    const raw = 'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      asset: 'rNVDA',
      rTokenSymbol: 'RNVDAUSDT',
      perpSymbol: 'NVDAUSDT',
      direction: 'long',
      leverage: 3,
      sizeUsdt: 5000,
      entryTiming: 'friday_close',
      holdingWindow: 'weekend',
      collateral: 'usdt',
      evidence: 'parsed',
    });
  });

  it('parses short input with direct syntax', () => {
    const raw = 'short rTSLA weekend 5x 10,000 USDT';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.asset).toBe('rTSLA');
    expect(result.value.rTokenSymbol).toBe('RTSLAUSDT');
    expect(result.value.perpSymbol).toBe('TSLAUSDT');
    expect(result.value.direction).toBe('short');
    expect(result.value.leverage).toBe(5);
    expect(result.value.sizeUsdt).toBe(10000);
    expect(result.value.holdingWindow).toBe('weekend');
    expect(result.value.evidence).toBe('parsed');
  });

  it('parses comma-formatted sizes correctly (12,500 -> 12500)', () => {
    const raw = 'long rAAPL weekend at 2x with 12,500 USDT';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.sizeUsdt).toBe(12500);
    expect(result.value.asset).toBe('rAAPL');
    expect(result.value.rTokenSymbol).toBe('RAAPLUSDT');
    expect(result.value.perpSymbol).toBe('AAPLUSDT');
    expect(result.value.leverage).toBe(2);
  });

  it('handles case-insensitive asset tokens and symbol variations', () => {
    const variations = [
      { raw: 'long RNVDA weekend 2x 1000 usdt', asset: 'rNVDA', rToken: 'RNVDAUSDT', perp: 'NVDAUSDT' },
      { raw: 'long rtsla weekend 2x 1000 usdt', asset: 'rTSLA', rToken: 'RTSLAUSDT', perp: 'TSLAUSDT' },
      { raw: 'long RQQQ weekend 2x 1000 usdt', asset: 'rQQQ', rToken: 'RQQQUSDT', perp: 'QQQUSDT' },
      { raw: 'long rmstr weekend 2x 1000 usdt', asset: 'rMSTR', rToken: 'RMSTRUSDT', perp: 'MSTRUSDT' },
    ];

    for (const v of variations) {
      const result = parseTradeIntent(v.raw);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value.asset).toBe(v.asset);
      expect(result.value.rTokenSymbol).toBe(v.rToken);
      expect(result.value.perpSymbol).toBe(v.perp);
    }
  });

  it('refuses unknown assets with PARSE_UNCERTAIN', () => {
    const raw = 'long rXYZ over the weekend at 3x with 5,000 USDT margin';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain("Unknown or unsupported asset 'rXYZ'");
  });

  it('refuses bare stock tickers without r-prefix with informative reason', () => {
    const raw = 'long NVDA over the weekend at 3x with 5,000 USDT margin';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain("Unknown or unsupported asset 'NVDA'");
  });

  it('refuses missing leverage with PARSE_UNCERTAIN and never guesses default', () => {
    const raw = 'long rNVDA weekend with 5,000 USDT';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('Missing leverage');
  });

  it('refuses missing size with PARSE_UNCERTAIN and never guesses default', () => {
    const raw = 'long rNVDA over the weekend at 3x';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('Missing margin size');
  });

  it('refuses garbage input with PARSE_UNCERTAIN listing multiple ambiguities', () => {
    const raw = 'hello world I like stocks';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('Missing direction');
    expect(result.error.reason).toContain('Missing asset');
    expect(result.error.reason).toContain('Missing leverage');
    expect(result.error.reason).toContain('Missing margin size');
    expect(result.error.reason).toContain('Missing holding window');
  });

  it('refuses empty input with PARSE_UNCERTAIN', () => {
    const result = parseTradeIntent('   ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('empty');
  });

  it('refuses conflicting directions (both long and short present)', () => {
    const raw = 'long and short rNVDA over the weekend at 3x with 5,000 USDT';
    const result = parseTradeIntent(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('Ambiguous direction');
  });

  it('rejects leverage outside [1, 25] bounds via validation', () => {
    const overLeveraged = 'long rNVDA weekend at 30x with 5,000 USDT';
    const result = parseTradeIntent(overLeveraged);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('PARSE_UNCERTAIN');
    expect(result.error.reason).toContain('leverage must be between 1 and 25');
  });
});

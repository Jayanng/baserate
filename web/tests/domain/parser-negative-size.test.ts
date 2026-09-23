import { describe, it, expect } from 'vitest';
import { parseTradeIntent } from '../../src/domain/trade-parser';

describe('parser negative-size regression (audit 2026-09-23)', () => {
  it('refuses a negative margin size instead of silently reading its magnitude', () => {
    const r = parseTradeIntent('long rNVDA over the weekend at 3x with -5000 USDT');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('PARSE_UNCERTAIN');
    }
  });

  it('refuses a negative size in other formats', () => {
    expect(parseTradeIntent('long rNVDA over the weekend at 3x with -$5,000').ok).toBe(false);
    expect(parseTradeIntent('short rTSLA over the weekend at 2x, size: -2500 USDT').ok).toBe(false);
  });

  it('still accepts the golden positive-size inputs', () => {
    expect(parseTradeIntent('I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.').ok).toBe(true);
    expect(parseTradeIntent('long rNVDA over the weekend at 3x with 5000 USDT').ok).toBe(true);
  });
});

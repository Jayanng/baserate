import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerForecast,
  getPendingForecasts,
  getAllForecasts,
  clearRegistry,
} from '@/src/scorekeeper/registry';

describe('scorekeeper registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('register creates record with pending status and valid id', () => {
    const record = registerForecast({
      tradeHash: 'a1b2c3d4',
      bandLowPct: -3.5,
      bandHighPct: 4.5,
      regime: 'trend_up',
      mode: 'live',
    });

    expect(record.status).toBe('pending');
    expect(typeof record.id).toBe('string');
    expect(record.id.length).toBeGreaterThan(0);
    expect(record.tradeHash).toBe('a1b2c3d4');
    expect(record.bandLowPct).toBe(-3.5);
    expect(record.bandHighPct).toBe(4.5);
    expect(record.regime).toBe('trend_up');
    expect(record.mode).toBe('live');
    expect(typeof record.issuedAtUtc).toBe('string');
    expect(!isNaN(Date.parse(record.issuedAtUtc))).toBe(true);
  });

  it('getPendingForecasts returns only pending', () => {
    const r1 = registerForecast({
      tradeHash: 'trade1',
      bandLowPct: -2,
      bandHighPct: 2,
      regime: 'chop',
      mode: 'live',
    });
    const r2 = registerForecast({
      tradeHash: 'trade2',
      bandLowPct: -4,
      bandHighPct: 4,
      regime: 'trend_up',
      mode: 'replay',
    });

    const pending = getPendingForecasts();
    expect(pending.length).toBe(2);
    expect(pending.map((p) => p.id)).toContain(r1.id);
    expect(pending.map((p) => p.id)).toContain(r2.id);
  });

  it('getAllForecasts returns all', () => {
    registerForecast({
      tradeHash: 'trade1',
      bandLowPct: -1,
      bandHighPct: 1,
      regime: 'chop',
      mode: 'live',
    });
    registerForecast({
      tradeHash: 'trade2',
      bandLowPct: -5,
      bandHighPct: 5,
      regime: 'capitulation',
      mode: 'replay',
    });

    const all = getAllForecasts();
    expect(all.length).toBe(2);
    expect(all[0]?.tradeHash).toBe('trade1');
    expect(all[1]?.tradeHash).toBe('trade2');
  });

  it('clearRegistry empties', () => {
    registerForecast({
      tradeHash: 'trade1',
      bandLowPct: -1,
      bandHighPct: 1,
      regime: 'squeeze',
      mode: 'live',
    });
    expect(getAllForecasts().length).toBe(1);

    clearRegistry();
    expect(getAllForecasts().length).toBe(0);
    expect(getPendingForecasts().length).toBe(0);
  });

  it('two registrations produce different ids', () => {
    const r1 = registerForecast({
      tradeHash: 'trade_alpha',
      bandLowPct: -2,
      bandHighPct: 3,
      regime: 'trend_up',
      mode: 'live',
    });
    const r2 = registerForecast({
      tradeHash: 'trade_beta',
      bandLowPct: -2,
      bandHighPct: 3,
      regime: 'trend_up',
      mode: 'live',
    });

    expect(r1.id).not.toBe(r2.id);
  });
});

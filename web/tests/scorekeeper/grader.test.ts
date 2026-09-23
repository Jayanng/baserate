import { describe, it, expect, beforeEach } from 'vitest';
import { gradeForecast, gradeAllPending } from '@/src/scorekeeper/grader';
import {
  registerForecast,
  clearRegistry,
} from '@/src/scorekeeper/registry';
import { type ForecastRecord } from '@/src/domain/types';

describe('scorekeeper grader', () => {
  beforeEach(() => {
    clearRegistry();
  });

  const baseRecord: ForecastRecord = {
    id: 'f1001',
    issuedAtUtc: '2026-09-20T12:00:00.000Z',
    tradeHash: 'th_nvda_long',
    bandLowPct: -3.0,
    bandHighPct: 5.0,
    regime: 'trend_up',
    status: 'pending',
    mode: 'live',
  };

  it('outcome inside band -> hit', () => {
    const graded = gradeForecast(baseRecord, 1.5);
    expect(graded.status).toBe('hit');
    expect(graded.id).toBe(baseRecord.id);
  });

  it('outcome below bandLow -> miss', () => {
    const graded = gradeForecast(baseRecord, -3.1);
    expect(graded.status).toBe('miss');
  });

  it('outcome above bandHigh -> miss', () => {
    const graded = gradeForecast(baseRecord, 5.1);
    expect(graded.status).toBe('miss');
  });

  it('outcome exactly on boundary -> hit', () => {
    const onLow = gradeForecast(baseRecord, -3.0);
    expect(onLow.status).toBe('hit');

    const onHigh = gradeForecast(baseRecord, 5.0);
    expect(onHigh.status).toBe('hit');
  });

  it('gradeForecast returns new object (input unchanged)', () => {
    const frozenInput = Object.freeze({ ...baseRecord });
    const result = gradeForecast(frozenInput, 2.0);

    expect(result).not.toBe(frozenInput);
    expect(frozenInput.status).toBe('pending');
    expect(result.status).toBe('hit');
  });

  it('gradeAllPending grades multiple correctly', () => {
    registerForecast({
      tradeHash: 'trade_1',
      bandLowPct: -2.0,
      bandHighPct: 4.0,
      regime: 'trend_up',
      mode: 'live',
    });
    registerForecast({
      tradeHash: 'trade_2',
      bandLowPct: -1.0,
      bandHighPct: 1.0,
      regime: 'chop',
      mode: 'live',
    });
    registerForecast({
      tradeHash: 'trade_3',
      bandLowPct: -5.0,
      bandHighPct: -1.0,
      regime: 'trend_down',
      mode: 'replay',
    });

    const outcomes = new Map<string, number>([
      ['trade_1', 1.0], // inside [-2, 4] -> hit
      ['trade_2', 3.5], // outside [-1, 1] -> miss
      ['trade_3', -3.0], // inside [-5, -1] -> hit
    ]);

    const results = gradeAllPending(outcomes);

    expect(results.length).toBe(3);

    const res1 = results.find((r) => r.record.tradeHash === 'trade_1');
    const res2 = results.find((r) => r.record.tradeHash === 'trade_2');
    const res3 = results.find((r) => r.record.tradeHash === 'trade_3');

    expect(res1?.result).toBe('hit');
    expect(res1?.record.status).toBe('hit');

    expect(res2?.result).toBe('miss');
    expect(res2?.record.status).toBe('miss');

    expect(res3?.result).toBe('hit');
    expect(res3?.record.status).toBe('hit');
  });
});

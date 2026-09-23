import { describe, it, expect } from 'vitest';
import {
  computeCalibration,
  computeBandAdjustments,
} from '@/src/scorekeeper/calibration';
import { type ForecastRecord, type RegimeTag } from '@/src/domain/types';

describe('scorekeeper calibration', () => {
  function makeRecords(count: number, hits: number, regime: RegimeTag): ForecastRecord[] {
    const records: ForecastRecord[] = [];
    for (let i = 0; i < count; i++) {
      const isHit = i < hits;
      records.push({
        id: `rec_${regime}_${i}`,
        issuedAtUtc: '2026-09-20T00:00:00.000Z',
        tradeHash: `trade_${regime}_${i}`,
        bandLowPct: -2.0,
        bandHighPct: 2.0,
        regime,
        status: isHit ? 'hit' : 'miss',
        mode: 'live',
      });
    }
    return records;
  }

  it('10 records all hits in trend_up -> reliable', () => {
    const records = makeRecords(10, 10, 'trend_up');
    const cal = computeCalibration(records);

    expect(cal.total).toBe(10);
    expect(cal.hits).toBe(10);
    expect(cal.misses).toBe(0);
    expect(cal.pending).toBe(0);

    const regimeCal = cal.byRegime.find((r) => r.regime === 'trend_up');
    expect(regimeCal).toBeDefined();
    expect(regimeCal?.status).toBe('reliable');
    expect(regimeCal?.total).toBe(10);
    expect(regimeCal?.hits).toBe(10);
  });

  it('10 records with 3 hits -> adjusted', () => {
    const records = makeRecords(10, 3, 'chop');
    const cal = computeCalibration(records);

    expect(cal.total).toBe(10);
    expect(cal.hits).toBe(3);
    expect(cal.misses).toBe(7);

    const regimeCal = cal.byRegime.find((r) => r.regime === 'chop');
    expect(regimeCal).toBeDefined();
    expect(regimeCal?.status).toBe('adjusted');
    expect(regimeCal?.total).toBe(10);
    expect(regimeCal?.hits).toBe(3);
  });

  it('3 records -> provisional', () => {
    const records = makeRecords(3, 3, 'capitulation');
    const cal = computeCalibration(records);

    expect(cal.total).toBe(3);
    expect(cal.hits).toBe(3);

    const regimeCal = cal.byRegime.find((r) => r.regime === 'capitulation');
    expect(regimeCal).toBeDefined();
    expect(regimeCal?.status).toBe('provisional');
  });

  it('computeBandAdjustments widens band for adjusted regime by correct amount', () => {
    // 10 records with 3 hits => 7 misses => missCount * 0.5 = 3.5 pp
    const records = makeRecords(10, 3, 'chop');
    const currentWidths: Record<RegimeTag, number> = {
      trend_up: 6.0,
      trend_down: 6.0,
      chop: 4.0,
      capitulation: 12.0,
      squeeze: 8.0,
      insufficient_evidence: 10.0,
    };

    const adjustments = computeBandAdjustments(records, currentWidths);
    expect(adjustments.length).toBe(1);

    const adj = adjustments[0];
    expect(adj?.regime).toBe('chop');
    expect(adj?.oldWidth).toBe(4.0);
    expect(adj?.newWidth).toBe(7.5);
    expect(adj?.reason).toContain('7 misses');
    expect(typeof adj?.timestampUtc).toBe('string');
  });

  it('no adjustment for reliable regime', () => {
    const records = makeRecords(10, 9, 'trend_up'); // 90% hit rate >= 0.7 -> reliable
    const currentWidths: Record<RegimeTag, number> = {
      trend_up: 6.0,
      trend_down: 6.0,
      chop: 4.0,
      capitulation: 12.0,
      squeeze: 8.0,
      insufficient_evidence: 10.0,
    };

    const adjustments = computeBandAdjustments(records, currentWidths);
    expect(adjustments.length).toBe(0);
  });

  it('widening capped at 5pp', () => {
    // 16 records with 2 hits => 14 misses => 14 * 0.5 = 7.0 pp -> capped at 5.0 pp
    const records = makeRecords(16, 2, 'squeeze');
    const currentWidths: Record<RegimeTag, number> = {
      trend_up: 6.0,
      trend_down: 6.0,
      chop: 4.0,
      capitulation: 12.0,
      squeeze: 8.0,
      insufficient_evidence: 10.0,
    };

    const adjustments = computeBandAdjustments(records, currentWidths);
    expect(adjustments.length).toBe(1);

    const adj = adjustments[0];
    expect(adj?.regime).toBe('squeeze');
    expect(adj?.oldWidth).toBe(8.0);
    expect(adj?.newWidth).toBe(13.0); // 8.0 + 5.0
  });
});

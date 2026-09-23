import { describe, it, expect } from 'vitest';
import {
  FIXTURE_FORECAST_RECORDS,
  FIXTURE_BAND_ADJUSTMENTS,
} from '@/components/scorecard/fixtures';
import { computeCalibration } from '@/src/scorekeeper/calibration';
import {
  appendToLedger,
  verifyLedgerIntegrity,
  type LedgerEntry,
} from '@/src/scorekeeper/ledger';

describe('Scorecard Phase 10 Replay Fixtures & Invariants', () => {
  it('contains exactly 12 total forecast records', () => {
    expect(FIXTURE_FORECAST_RECORDS.length).toBe(12);
  });

  it('all records are tagged mode: replay', () => {
    for (const r of FIXTURE_FORECAST_RECORDS) {
      expect(r.mode).toBe('replay');
    }
  });

  it('computes calibration: 10 hits, 2 misses, 0 pending -> 83% hit rate on graded forecasts', () => {
    const cal = computeCalibration(FIXTURE_FORECAST_RECORDS);

    expect(cal.total).toBe(12);
    expect(cal.hits).toBe(10);
    expect(cal.misses).toBe(2);
    expect(cal.pending).toBe(0);

    const gradedCount = cal.hits + cal.misses;
    expect(gradedCount).toBe(12);
    const hitRate = Math.round((cal.hits / gradedCount) * 100);
    expect(hitRate).toBe(83);
  });

  it('verifies regime distribution and status assignments', () => {
    const cal = computeCalibration(FIXTURE_FORECAST_RECORDS);

    // 5 regimes represented across history
    expect(cal.byRegime.length).toBe(5);

    for (const reg of cal.byRegime) {
      expect(reg.total).toBeGreaterThanOrEqual(2);
      expect(reg.status).toBe('provisional');
    }

    const trendUp = cal.byRegime.find((r) => r.regime === 'trend_up');
    expect(trendUp).toBeDefined();
    expect(trendUp?.total).toBe(3);
    expect(trendUp?.hits).toBe(3);

    const capitulation = cal.byRegime.find((r) => r.regime === 'capitulation');
    expect(capitulation).toBeDefined();
    expect(capitulation?.total).toBe(2);
    expect(capitulation?.hits).toBe(1);

    const squeeze = cal.byRegime.find((r) => r.regime === 'squeeze');
    expect(squeeze).toBeDefined();
    expect(squeeze?.total).toBe(2);
    expect(squeeze?.hits).toBe(1);
  });

  it('chains all 12 records into an immutable ledger and passes cryptographic verification', () => {
    let chain: LedgerEntry[] = [];
    for (const r of FIXTURE_FORECAST_RECORDS) {
      chain = appendToLedger(chain, r.id, r.status);
    }

    expect(chain.length).toBe(12);
    expect(chain[0]?.previousHash).toBe('GENESIS');
    expect(verifyLedgerIntegrity(chain)).toBe(true);

    // Tampering test: mutating any entry must fail verification
    const tampered = chain.map((entry, idx) =>
      idx === 5 ? { ...entry, grade: 'miss' as const } : entry
    );
    expect(verifyLedgerIntegrity(tampered)).toBe(false);
  });

  it('band adjustments array evaluates deterministically', () => {
    // Math decides: provisional regimes (<5) receive no widening adjustment
    expect(Array.isArray(FIXTURE_BAND_ADJUSTMENTS)).toBe(true);
    expect(FIXTURE_BAND_ADJUSTMENTS.length).toBe(0);
  });
});

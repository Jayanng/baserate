import { describe, it, expect } from 'vitest';
import { buildDossier } from '@/src/engine/dossier-builder';
import type { ParsedTrade, WeekendGapObservation } from '@/src/domain/types';

describe('dossier-builder', () => {
  const goldenTrade: ParsedTrade = {
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

  const syntheticGaps: WeekendGapObservation[] = Array.from({ length: 20 }, (_, i) => ({
    pct: i % 2 === 0 ? 2.5 - i * 0.4 : -1.5 - i * 0.6,
    episodeDate: `2025-01-${String(i + 1).padStart(2, '0')}`,
    source: 'yahoo_native',
  }));

  const syntheticCandles: Array<{ close: number; tsMs: number }> = Array.from(
    { length: 60 },
    (_, i) => ({
      close: 200 + (i % 5) * 2,
      tsMs: 1700000000000 + i * 86400000,
    })
  );

  it('golden trade (rNVDA long 3x 5000 USDT) produces valid Dossier with no refusal', () => {
    const dossier = buildDossier({
      parsed: goldenTrade,
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: syntheticGaps,
      nativeCandles: syntheticCandles,
    });

    // No refusal
    expect(dossier.refusal).toBeNull();

    // Parsed trade is preserved
    expect(dossier.parsed).toEqual(goldenTrade);

    // Risks are computed
    expect(dossier.risks.liquidationDistancePct).not.toBeNull();
    if (dossier.risks.liquidationDistancePct) {
      expect(dossier.risks.liquidationDistancePct.value).toBeCloseTo(-32.83, 1);
      expect(dossier.risks.liquidationDistancePct.evidence.label).toBe('computed');
      expect(dossier.risks.liquidationDistancePct.evidence.source).toBe('engine_risk');
    }

    expect(dossier.risks.fundingCarryPct).not.toBeNull();
    if (dossier.risks.fundingCarryPct) {
      expect(dossier.risks.fundingCarryPct.value).toBeCloseTo(0.16425, 4);
      expect(dossier.risks.fundingCarryPct.evidence.label).toBe('computed');
    }

    expect(dossier.risks.worstGapPct).not.toBeNull();
    if (dossier.risks.worstGapPct) {
      expect(dossier.risks.worstGapPct.value).toBeLessThan(0);
      expect(dossier.risks.worstGapPct.evidence.label).toBe('computed');
    }

    // Regime classification
    expect(dossier.regime).not.toBe('insufficient_evidence');

    // Distribution
    expect(dossier.distribution).not.toBeNull();
    if (dossier.distribution) {
      expect(dossier.distribution.sampleSize).toBe(20);
      const totalPct = dossier.distribution.categories.reduce((acc, c) => acc + c.pct, 0);
      expect(totalPct).toBe(100);
    }

    // Provenance items include observed and computed
    expect(dossier.provenance.length).toBeGreaterThan(0);
    const labels = new Set(dossier.provenance.map((p) => p.label));
    expect(labels.has('observed')).toBe(true);
    expect(labels.has('computed')).toBe(true);
  });

  it('missing funding rate still builds with null funding carry and no refusal', () => {
    const dossier = buildDossier({
      parsed: goldenTrade,
      spotPrice: 228,
      fundingRate: null,
      gaps: syntheticGaps,
      nativeCandles: syntheticCandles,
    });

    expect(dossier.refusal).toBeNull();
    expect(dossier.risks.fundingCarryPct).toBeNull();
    expect(dossier.risks.liquidationDistancePct).not.toBeNull();
    expect(dossier.distribution).not.toBeNull();
  });

  it('missing candles triggers INSUFFICIENT_EVIDENCE refusal', () => {
    const dossier = buildDossier({
      parsed: goldenTrade,
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: syntheticGaps,
      nativeCandles: [], // Missing / empty candles
    });

    expect(dossier.refusal).not.toBeNull();
    expect(dossier.refusal?.code).toBe('INSUFFICIENT_EVIDENCE');
    expect(dossier.refusal?.reason).toContain('minimum 50 required');
    expect(dossier.regime).toBe('insufficient_evidence');
  });

  it('insufficient candles (< 50) triggers INSUFFICIENT_EVIDENCE refusal', () => {
    const dossier = buildDossier({
      parsed: goldenTrade,
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: syntheticGaps,
      nativeCandles: syntheticCandles.slice(0, 45), // Only 45 candles
    });

    expect(dossier.refusal).not.toBeNull();
    expect(dossier.refusal?.code).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('non-positive spot price triggers UNAVAILABLE refusal', () => {
    const dossier = buildDossier({
      parsed: goldenTrade,
      spotPrice: 0,
      fundingRate: 0.000219,
      gaps: syntheticGaps,
      nativeCandles: syntheticCandles,
    });

    expect(dossier.refusal).not.toBeNull();
    expect(dossier.refusal?.code).toBe('UNAVAILABLE');
    expect(dossier.risks.liquidationDistancePct).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { buildDossier } from '../../src/engine/dossier-builder';
import type { ParsedTrade } from '../../src/domain/types';

// Audit 2026-09-23 regression: an invalid leverage (<= 1) reaching buildDossier must
// produce a refusal state, not a silently empty liquidation metric.
describe('dossier-builder leverage guard', () => {
  const base: ParsedTrade = {
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
  const candles = Array.from({ length: 60 }, (_, i) => ({
    close: 200 + (i % 5) * 2,
    tsMs: 1700000000000 + i * 86400000,
  }));

  it('records a refusal when leverage <= 1 bypasses upstream validation', () => {
    const d = buildDossier({
      parsed: { ...base, leverage: 0.5 },
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: [],
      nativeCandles: candles,
    });
    expect(d.refusal).not.toBeNull();
    expect(d.refusal?.code).toBe('PARSE_UNCERTAIN');
    expect(d.risks.liquidationDistancePct).toBeNull();
  });

  it('leverage exactly 1 also refuses', () => {
    const d = buildDossier({
      parsed: { ...base, leverage: 1 },
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: [],
      nativeCandles: candles,
    });
    expect(d.refusal?.code).toBe('PARSE_UNCERTAIN');
  });

  it('valid leverage still builds with no refusal', () => {
    const d = buildDossier({
      parsed: base,
      spotPrice: 228,
      fundingRate: 0.000219,
      gaps: [],
      nativeCandles: candles,
    });
    expect(d.refusal).toBeNull();
    expect(d.risks.liquidationDistancePct).not.toBeNull();
  });
});

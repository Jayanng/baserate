import { describe, it, expect } from 'vitest';
import {
  classifyRegime,
  computeRegimeFeatures,
  MIN_REGIME_CANDLES,
  SMA20_PERIOD,
  SMA50_PERIOD,
  CAPITULATION_RETURN_PCT,
  SQUEEZE_RETURN_PCT,
  TREND_UP_SMA_MULTIPLIER,
  TREND_DOWN_SMA_MULTIPLIER,
} from '@/src/engine/regime-classifier';

function makeCandles(closes: number[]): Array<{ close: number }> {
  return closes.map((close) => ({ close }));
}

function makeUniformCandles(count: number, close: number = 100): Array<{ close: number }> {
  return Array.from({ length: count }, () => ({ close }));
}

describe('regime-classifier', () => {
  it('exports published threshold constants', () => {
    expect(MIN_REGIME_CANDLES).toBe(50);
    expect(SMA20_PERIOD).toBe(20);
    expect(SMA50_PERIOD).toBe(50);
    expect(CAPITULATION_RETURN_PCT).toBe(-8);
    expect(SQUEEZE_RETURN_PCT).toBe(8);
    expect(TREND_UP_SMA_MULTIPLIER).toBe(1.02);
    expect(TREND_DOWN_SMA_MULTIPLIER).toBe(0.98);
  });

  it('returns insufficient_evidence when candles.length < 50', () => {
    expect(classifyRegime([])).toBe('insufficient_evidence');
    expect(classifyRegime(makeUniformCandles(49, 100))).toBe('insufficient_evidence');
    expect(computeRegimeFeatures(makeUniformCandles(49, 100))).toBeNull();
  });

  it('classifies capitulation when 5-period return is < -8%', () => {
    // 45 candles at 100, then drop sharply to 90 at index 49 (return = (90 - 100)/100 = -10% < -8%)
    const closes: number[] = Array.from({ length: 45 }, () => 100);
    closes.push(98, 96, 94, 92, 90);
    expect(closes).toHaveLength(50);

    const regime = classifyRegime(makeCandles(closes));
    expect(regime).toBe('capitulation');
  });

  it('classifies squeeze when 5-period return is > +8%', () => {
    // 45 candles at 100, then surge sharply to 110 at index 49 (return = (110 - 100)/100 = +10% > +8%)
    const closes: number[] = Array.from({ length: 45 }, () => 100);
    closes.push(102, 104, 106, 108, 110);
    expect(closes).toHaveLength(50);

    const regime = classifyRegime(makeCandles(closes));
    expect(regime).toBe('squeeze');
  });

  it('classifies trend_up when SMA20 > SMA50 * 1.02 AND 5-period return > 0', () => {
    // 30 candles at 100, then 15 at 110, then modest rise to 113.3 at index 49 (return = +3% > 0 and <= +8%)
    const closes: number[] = [
      ...Array.from({ length: 30 }, () => 100),
      ...Array.from({ length: 15 }, () => 110),
      111,
      111,
      111,
      111,
      113.3,
    ];
    expect(closes).toHaveLength(50);

    const features = computeRegimeFeatures(makeCandles(closes));
    expect(features).not.toBeNull();
    if (features) {
      expect(features.return5dPct).toBeCloseTo(3.0, 1);
      expect(features.sma20).toBeGreaterThan(features.sma50 * 1.02);
    }

    const regime = classifyRegime(makeCandles(closes));
    expect(regime).toBe('trend_up');
  });

  it('classifies trend_down when SMA20 < SMA50 * 0.98 AND 5-period return < 0', () => {
    // 30 candles at 100, then 15 at 90, then modest drop to 87.3 at index 49 (return = -3% < 0 and >= -8%)
    const closes: number[] = [
      ...Array.from({ length: 30 }, () => 100),
      ...Array.from({ length: 15 }, () => 90),
      89,
      89,
      89,
      89,
      87.3,
    ];
    expect(closes).toHaveLength(50);

    const features = computeRegimeFeatures(makeCandles(closes));
    expect(features).not.toBeNull();
    if (features) {
      expect(features.return5dPct).toBeCloseTo(-3.0, 1);
      expect(features.sma20).toBeLessThan(features.sma50 * 0.98);
    }

    const regime = classifyRegime(makeCandles(closes));
    expect(regime).toBe('trend_down');
  });

  it('classifies chop when market is flat or without clear trend', () => {
    const closes = Array.from({ length: 50 }, () => 100);
    const regime = classifyRegime(makeCandles(closes));
    expect(regime).toBe('chop');
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildMatchExplanation,
  deriveDateRangeFromGaps,
  type MatchExplanation,
} from '@/components/dossier/match-explanation';
import { getReplayGaps } from '@/src/data/replay-fixtures';
import type { ParsedTrade } from '@/src/domain/types';

const nvdaTrade: ParsedTrade = {
  asset: 'rNVDA',
  rTokenSymbol: 'rNVDA',
  perpSymbol: 'NVDAUSDT',
  direction: 'long',
  sizeUsdt: 5000,
  leverage: 3,
  entryTiming: 'friday_close',
  holdingWindow: 'weekend',
  collateral: 'usdt',
  evidence: 'parsed',
};

const tslaTrade: ParsedTrade = {
  asset: 'rTSLA',
  rTokenSymbol: 'rTSLA',
  perpSymbol: 'TSLAUSDT',
  direction: 'long',
  sizeUsdt: 5000,
  leverage: 2,
  entryTiming: 'friday_close',
  holdingWindow: 'weekend',
  collateral: 'usdt',
  evidence: 'parsed',
};

const aaplTrade: ParsedTrade = {
  asset: 'rAAPL',
  rTokenSymbol: 'rAAPL',
  perpSymbol: 'AAPLUSDT',
  direction: 'short',
  sizeUsdt: 10000,
  leverage: 4,
  entryTiming: 'friday_close',
  holdingWindow: 'weekend',
  collateral: 'usdt',
  evidence: 'parsed',
};

const qqqTrade: ParsedTrade = {
  asset: 'rQQQ',
  rTokenSymbol: 'rQQQ',
  perpSymbol: 'QQQUSDT',
  direction: 'long',
  sizeUsdt: 2500,
  leverage: 5,
  entryTiming: 'friday_close',
  holdingWindow: 'weekend',
  collateral: 'usdt',
  evidence: 'parsed',
};

const mstrTrade: ParsedTrade = {
  asset: 'rMSTR',
  rTokenSymbol: 'rMSTR',
  perpSymbol: 'MSTRUSDT',
  direction: 'long',
  sizeUsdt: 3000,
  leverage: 2,
  entryTiming: 'friday_close',
  holdingWindow: 'weekend',
  collateral: 'usdt',
  evidence: 'parsed',
};

describe('match-explanation', () => {
  it('builds valid explanation for NVDA with all required fields non-empty', () => {
    const explanation: MatchExplanation = buildMatchExplanation(
      nvdaTrade,
      'trend_down',
      1227
    );

    // Required fields: asset, direction, leverage, holding window, entry timing, regime, sample size, history source/date range, summary
    expect(explanation.asset).toBe('rNVDA');
    expect(explanation.direction).toBe('long');
    expect(explanation.leverage).toBe(3);
    expect(explanation.holdingWindow).toBe('weekend hold');
    expect(explanation.entryTiming).toBe('Friday-close entry');
    expect(explanation.regime).toBe('trend_down');
    expect(explanation.sampleSize).toBe(1227);
    expect(explanation.totalAvailableEpisodes).toBe(1227);
    expect(explanation.historySource).toContain('NVDA');
    expect(explanation.dateRange).toBe('1999–2026');
    expect(explanation.historySourceDateRange).toBe(
      'native NVDA daily closes, 1999–2026'
    );
    expect(explanation.summary.length).toBeGreaterThan(0);
    expect(explanation.matchingPolicy.length).toBeGreaterThan(0);

    // Aliased fields
    expect(explanation['holding window']).toBe('weekend hold');
    expect(explanation['entry timing']).toBe('Friday-close entry');
    expect(explanation['sample size']).toBe(1227);
    expect(explanation['history source/date range']).toBe(
      'native NVDA daily closes, 1999–2026'
    );
    expect(explanation['plain-English summary']).toBe(explanation.summary);
  });

  it('asserts all required fields are non-empty for non-NVDA assets', () => {
    const assets = [tslaTrade, aaplTrade, qqqTrade, mstrTrade];
    for (const trade of assets) {
      const explanation = buildMatchExplanation(trade, 'chop', 500);

      expect(explanation.asset.trim().length).toBeGreaterThan(0);
      expect(explanation.direction.trim().length).toBeGreaterThan(0);
      expect(explanation.leverage).toBeGreaterThan(0);
      expect(explanation.holdingWindow.trim().length).toBeGreaterThan(0);
      expect(explanation.entryTiming.trim().length).toBeGreaterThan(0);
      expect(String(explanation.regime).trim().length).toBeGreaterThan(0);
      expect(explanation.sampleSize).toBe(500);
      expect(explanation.historySource.trim().length).toBeGreaterThan(0);
      expect(explanation.dateRange.trim().length).toBeGreaterThan(0);
      expect(explanation.historySourceDateRange.trim().length).toBeGreaterThan(0);
      expect(explanation.summary.trim().length).toBeGreaterThan(0);
      expect(explanation.matchingPolicy.trim().length).toBeGreaterThan(0);
    }
  });

  it('asserts no hardcoded NVDA source or dates appear in TSLA output', () => {
    const explanation = buildMatchExplanation(tslaTrade, 'trend_up', 736);

    expect(explanation.asset).toBe('rTSLA');
    expect(explanation.sampleSize).toBe(736);

    // TSLA starts in 2010, not 1999
    expect(explanation.dateRange).toBe('2010–2026');
    expect(explanation.historySourceDateRange).toContain('TSLA');
    expect(explanation.historySourceDateRange).toContain('2010');

    // Strictly ensure no NVDA or 1999 references leaked into TSLA explanation
    expect(explanation.historySourceDateRange).not.toContain('NVDA');
    expect(explanation.historySourceDateRange).not.toContain('1999');
    expect(explanation.historySource).not.toContain('NVDA');
    expect(explanation.historySource).toContain('TSLA');
    expect(explanation.summary).not.toContain('NVDA');
    expect(explanation.summary).not.toContain('1999');
    expect(explanation.summary).toContain('TSLA');
    expect(explanation.summary).toContain('2010');
    expect(explanation.matchingPolicy).not.toContain('NVDA');
  });

  it('asserts sample size strictly comes from passed data', () => {
    const customSampleSize = 842;
    const explanation = buildMatchExplanation(
      nvdaTrade,
      'trend_down',
      customSampleSize,
      undefined,
      undefined
    );

    expect(explanation.sampleSize).toBe(customSampleSize);
    expect(explanation['sample size']).toBe(customSampleSize);
    expect(explanation.summary).toContain('842');
  });

  it('asserts policy text does not falsely say only a subset if total distribution is used', () => {
    // When the full distribution sample is used (sampleSize === totalAvailableEpisodes)
    const explanation = buildMatchExplanation(nvdaTrade, 'trend_down', 1227);

    expect(explanation.isFilteredSubset).toBe(false);
    expect(explanation.matchingPolicy).toContain(
      'Regime-tagged full distribution'
    );
    expect(explanation.matchingPolicy).toContain('all 1,227 observed');
    expect(explanation.matchingPolicy.toLowerCase()).not.toContain('subset');
    expect(explanation.matchingPolicy.toLowerCase()).not.toContain('only a subset');
    expect(explanation.summary).toContain('regime-tagged full distribution');
    expect(explanation.summary.toLowerCase()).not.toContain('subset');
  });

  it('truthfully distinguishes a filtered subset when sample size is smaller than total available', () => {
    const explanation = buildMatchExplanation({
      parsed: nvdaTrade,
      regime: 'capitulation',
      sampleSize: 42,
      totalAvailableEpisodes: 1227,
    });

    expect(explanation.isFilteredSubset).toBe(true);
    expect(explanation.matchingPolicy).toContain('Regime-filtered subset');
    expect(explanation.matchingPolicy).toContain('42 of 1,227');
    expect(explanation.summary).toContain('regime-filtered subset');
  });

  it('derives asset-specific history correctly for AAPL, QQQ, and MSTR', () => {
    const aapl = buildMatchExplanation(aaplTrade, 'chop', 1227);
    expect(aapl.historySourceDateRange).toContain('AAPL');
    expect(aapl.historySource).toContain('AAPL');
    expect(aapl.historySourceDateRange).not.toContain('NVDA');

    const qqq = buildMatchExplanation(qqqTrade, 'squeeze', 1227);
    expect(qqq.historySourceDateRange).toContain('QQQ');
    expect(qqq.historySource).toContain('QQQ');
    expect(qqq.historySourceDateRange).not.toContain('NVDA');

    const mstr = buildMatchExplanation(mstrTrade, 'squeeze', 1227);
    expect(mstr.historySourceDateRange).toContain('MSTR');
    expect(mstr.historySource).toContain('MSTR');
    expect(mstr.historySourceDateRange).not.toContain('NVDA');
  });

  it('deriveDateRangeFromGaps accurately parses gaps for NVDA and TSLA', () => {
    const nvdaGaps = getReplayGaps('rNVDA');
    const tslaGaps = getReplayGaps('rTSLA');

    expect(deriveDateRangeFromGaps(nvdaGaps)).toBe('1999–2026');
    expect(deriveDateRangeFromGaps(tslaGaps)).toBe('2010–2026');
    expect(deriveDateRangeFromGaps([])).toBe('1999–2026');
  });

  it('supports both positional arguments and object parameter signatures identically', () => {
    const positional = buildMatchExplanation(nvdaTrade, 'trend_down', 1227);
    const objectSig = buildMatchExplanation({
      parsed: nvdaTrade,
      regime: 'trend_down',
      sampleSize: 1227,
    });

    expect(positional.asset).toBe(objectSig.asset);
    expect(positional.direction).toBe(objectSig.direction);
    expect(positional.leverage).toBe(objectSig.leverage);
    expect(positional.holdingWindow).toBe(objectSig.holdingWindow);
    expect(positional.entryTiming).toBe(objectSig.entryTiming);
    expect(positional.regime).toBe(objectSig.regime);
    expect(positional.sampleSize).toBe(objectSig.sampleSize);
    expect(positional.historySourceDateRange).toBe(
      objectSig.historySourceDateRange
    );
    expect(positional.matchingPolicy).toBe(objectSig.matchingPolicy);
    expect(positional.summary).toBe(objectSig.summary);
  });
});

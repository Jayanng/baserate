import { describe, it, expect } from 'vitest';
import {
  toMarketSnapshot,
  toFundingObservation,
  estimateFundingCarryPct,
  toWeekendGaps,
} from '@/src/data/normalizers';
import type {
  BitgetSpotTicker,
  BitgetOrderBook,
  BitgetCurrentFunding,
  BitgetFundingHistoryRow,
} from '@/src/data/bitget-client';
import type { YahooCandle } from '@/src/data/yahoo-client';

describe('normalizers', () => {
  describe('estimateFundingCarryPct', () => {
    it('computes funding carry math accurately: 3 rows of -0.0001 over 60h -> -0.075%', () => {
      const rows: BitgetFundingHistoryRow[] = [
        { fundingRate: -0.0001, fundingTime: 1790006400000 },
        { fundingRate: -0.0001, fundingTime: 1790035200000 },
        { fundingRate: -0.0001, fundingTime: 1790064000000 },
      ];
      const holdingHours = 60; // 60h / 8h = 7.5 intervals
      // -0.0001 * 7.5 = -0.00075 -> -0.075%

      const result = estimateFundingCarryPct(rows, holdingHours);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.value).toBe(-0.075);
        expect(result.value.evidence.label).toBe('estimated');
        expect(result.value.evidence.source).toBe('bitget_mix');
      }
    });

    it('refuses with INSUFFICIENT_EVIDENCE when history has fewer than 3 rows', () => {
      const rows: BitgetFundingHistoryRow[] = [
        { fundingRate: -0.0001, fundingTime: 1790006400000 },
        { fundingRate: -0.0001, fundingTime: 1790035200000 },
      ];

      const result = estimateFundingCarryPct(rows, 60);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INSUFFICIENT_EVIDENCE');
        expect(result.error.reason).toContain('minimum 3 required');
      }
    });

    it('refuses when rows array is empty', () => {
      const result = estimateFundingCarryPct([], 60);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INSUFFICIENT_EVIDENCE');
      }
    });
  });

  describe('toFundingObservation', () => {
    it('funding observation gets proxyUsed=true + estimated label', () => {
      const current: BitgetCurrentFunding = {
        symbol: 'NVDAUSDT',
        fundingRate: 0.000217,
        fundingRateInterval: 8,
        nextUpdate: 1790121600000,
      };

      const obs = toFundingObservation(current, [], 60);
      expect(obs.proxyUsed).toBe(true);
      expect(obs.label).toBe('estimated');
      expect(obs.note).toBe('stock-perp funding proxy for rToken');
      expect(obs.ratePerInterval).toBe(0.000217);
      expect(obs.intervalHours).toBe(8);
      expect(obs.source).toBe('bitget_mix');
      expect(obs.evidence?.label).toBe('estimated');
      expect(obs.evidence?.note).toBe('stock-perp funding proxy for rToken');
    });

    it('handles null current funding with unavailable source and proxy disclosure', () => {
      const obs = toFundingObservation(null);
      expect(obs.proxyUsed).toBe(true);
      expect(obs.ratePerInterval).toBeNull();
      expect(obs.source).toBe('unavailable');
      expect(obs.note).toBe('stock-perp funding proxy for rToken');
    });

    it('allows explicit observed label when specified', () => {
      const current: BitgetCurrentFunding = {
        symbol: 'NVDAUSDT',
        fundingRate: 0.000217,
        fundingRateInterval: 8,
        nextUpdate: 1790121600000,
      };

      const obs = toFundingObservation(current, [], 60, 'observed');
      expect(obs.label).toBe('observed');
      expect(obs.proxyUsed).toBe(true);
    });
  });

  describe('toWeekendGaps', () => {
    it('pairs synthetic Friday/Monday candles, computes correct pct, skips incomplete weeks, sorts desc by magnitude', () => {
      // 2026-09-04 is Friday (UTC day 5)
      // 2026-09-07 is Monday (UTC day 1) -> +5.0% change (100 -> 105)
      const fri1Ts = Date.UTC(2026, 8, 4, 20, 0, 0);
      const mon1Ts = Date.UTC(2026, 8, 7, 13, 30, 0);

      // 2026-09-11 is Friday
      // 2026-09-14 is Monday -> -10.0% change (200 -> 180)
      const fri2Ts = Date.UTC(2026, 8, 11, 20, 0, 0);
      const mon2Ts = Date.UTC(2026, 8, 14, 13, 30, 0);

      // 2026-09-18 is Friday
      // Next candle is Tuesday 2026-09-22 (Monday was holiday) -> INCOMPLETE WEEK, MUST BE SKIPPED
      const fri3Ts = Date.UTC(2026, 8, 18, 20, 0, 0);
      const tue3Ts = Date.UTC(2026, 8, 22, 13, 30, 0);

      // Monday 2026-09-28 has no preceding Friday candle -> INCOMPLETE, MUST BE SKIPPED
      const mon4Ts = Date.UTC(2026, 8, 28, 13, 30, 0);

      const syntheticCandles: YahooCandle[] = [
        { tsMs: fri1Ts, close: 100 },
        { tsMs: mon1Ts, close: 105 },
        { tsMs: fri2Ts, close: 200 },
        { tsMs: mon2Ts, close: 180 },
        { tsMs: fri3Ts, close: 150 },
        { tsMs: tue3Ts, close: 160 },
        { tsMs: mon4Ts, close: 220 },
      ];

      const gaps = toWeekendGaps(syntheticCandles);

      // Expect exactly 2 complete pairs
      expect(gaps).toHaveLength(2);

      // Sorted descending by magnitude: |-10%| = 10 > |+5%| = 5
      expect(gaps[0]).toEqual({
        pct: -10,
        episodeDate: '2026-09-11',
        source: 'yahoo_native',
      });

      expect(gaps[1]).toEqual({
        pct: 5,
        episodeDate: '2026-09-04',
        source: 'yahoo_native',
      });
    });

    it('returns empty array when candle list is empty', () => {
      const gaps = toWeekendGaps([]);
      expect(gaps).toEqual([]);
    });
  });

  describe('toMarketSnapshot', () => {
    it('normalizes spot ticker and order book with observed label and bitget_spot source', () => {
      const ticker: BitgetSpotTicker = {
        symbol: 'RNVDAUSDT',
        lastPr: 228.2,
        bidPr: 228.18,
        askPr: 228.2,
        ts: 1790112451946,
      };

      const orderBook: BitgetOrderBook = {
        bids: [{ price: 228.13, size: 2 }],
        asks: [{ price: 228.17, size: 3 }],
        ts: 1790112451946,
      };

      const snapshot = toMarketSnapshot(ticker, orderBook);

      expect(snapshot.asset).toBe('rNVDA');
      expect(snapshot.rTokenSymbol).toBe('RNVDAUSDT');
      expect(snapshot.perpSymbol).toBe('NVDAUSDT');
      expect(snapshot.spotPrice).not.toBeNull();
      expect(snapshot.spotPrice?.value).toBe(228.2);
      expect(snapshot.spotPrice?.evidence.label).toBe('observed');
      expect(snapshot.spotPrice?.evidence.source).toBe('bitget_spot');
      expect(snapshot.spotPrice?.evidence.timestampUtc).toBe(
        new Date(1790112451946).toISOString()
      );
      // depthTopUsdt = 228.13 * 2 + 228.17 * 3 = 456.26 + 684.51 = 1140.77
      expect(snapshot.depthTopUsdt).toBe(1140.77);
      expect(snapshot.health.bitget).toBe('ok');
    });

    it('handles null orderbook gracefully', () => {
      const ticker: BitgetSpotTicker = {
        symbol: 'RNVDAUSDT',
        lastPr: 228.2,
        bidPr: 228.18,
        askPr: 228.2,
        ts: 1790112451946,
      };

      const snapshot = toMarketSnapshot(ticker, null);
      expect(snapshot.depthTopUsdt).toBeNull();
      expect(snapshot.spotPrice?.value).toBe(228.2);
    });
  });
});

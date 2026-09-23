import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchNativeHistory,
  isAllowedYahooTicker,
  YahooError,
} from '@/src/data/yahoo-client';

describe('yahoo-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ticker allowlist enforcement', () => {
    it('rejects unapproved ticker AMD with typed YahooError', async () => {
      await expect(fetchNativeHistory('AMD', 5)).rejects.toThrow(YahooError);

      try {
        await fetchNativeHistory('AMD', 5);
        expect.unreachable('Should have thrown YahooError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(YahooError);
        const yErr = err as YahooError;
        expect(yErr.code).toBe('UNSUPPORTED_TICKER');
        expect(yErr.message).toContain('AMD');
      }
    });

    it('rejects other unapproved tickers like SPY, MSFT, BTC', async () => {
      expect(isAllowedYahooTicker('SPY')).toBe(false);
      expect(isAllowedYahooTicker('MSFT')).toBe(false);
      expect(isAllowedYahooTicker('BTC')).toBe(false);
    });

    it('accepts all allowed tickers: NVDA, TSLA, AAPL, QQQ, MSTR (case-insensitive)', () => {
      expect(isAllowedYahooTicker('NVDA')).toBe(true);
      expect(isAllowedYahooTicker('TSLA')).toBe(true);
      expect(isAllowedYahooTicker('AAPL')).toBe(true);
      expect(isAllowedYahooTicker('QQQ')).toBe(true);
      expect(isAllowedYahooTicker('MSTR')).toBe(true);

      // Case insensitive
      expect(isAllowedYahooTicker('nvda')).toBe(true);
      expect(isAllowedYahooTicker('aapl')).toBe(true);
    });
  });

  describe('happy path parsing and null closes skipping', () => {
    it('parses candles, skips null closes, and computes ISO boundaries accurately', async () => {
      const mockPayload = {
        chart: {
          result: [
            {
              timestamp: [1700000000, 1700086400, 1700172800, 1700259200],
              indicators: {
                quote: [
                  {
                    close: [480.5, null, 492.25, 495.0],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const result = await fetchNativeHistory('NVDA', 1);

      // Null close at index 1 is skipped, leaving 3 candles
      expect(result.count).toBe(3);
      expect(result.candles).toEqual([
        { tsMs: 1700000000000, close: 480.5 },
        { tsMs: 1700172800000, close: 492.25 },
        { tsMs: 1700259200000, close: 495.0 },
      ]);
      expect(result.firstDateIso).toBe(new Date(1700000000000).toISOString());
      expect(result.lastDateIso).toBe(new Date(1700259200000).toISOString());
    });
  });

  describe('chart error validation', () => {
    it('throws typed YahooError when chart.error is present', async () => {
      const mockPayload = {
        chart: {
          result: null,
          error: {
            code: 'Not Found',
            description: 'No data found, symbol may be delisted',
          },
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      try {
        await fetchNativeHistory('NVDA', 5);
        expect.unreachable('Should have thrown YahooError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(YahooError);
        const yErr = err as YahooError;
        expect(yErr.code).toBe('Not Found');
        expect(yErr.message).toContain('No data found');
      }
    });
  });

  describe('timeout path', () => {
    it('catches TimeoutError and throws typed YahooError with TIMEOUT code', async () => {
      const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(timeoutError)
      );

      try {
        await fetchNativeHistory('NVDA', 10);
        expect.unreachable('Should have thrown YahooError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(YahooError);
        const yErr = err as YahooError;
        expect(yErr.code).toBe('TIMEOUT');
        expect(yErr.message).toContain('timed out');
      }
    });
  });
});

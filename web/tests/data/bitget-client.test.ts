import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchSpotTicker,
  fetchSpotOrderBook,
  fetchSpotCandles,
  fetchCurrentFunding,
  fetchFundingHistory,
  fetchPerpCandles,
  BitgetError,
} from '@/src/data/bitget-client';

describe('bitget-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('envelope success path', () => {
    it('fetchSpotTicker unpacks envelope and normalizes numeric values', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        requestTime: 1790112453622,
        data: [
          {
            symbol: 'RNVDAUSDT',
            lastPr: '228.2',
            bidPr: '228.18',
            askPr: '228.2',
            ts: '1790112451946',
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const ticker = await fetchSpotTicker('RNVDAUSDT');
      expect(ticker).toEqual({
        symbol: 'RNVDAUSDT',
        lastPr: 228.2,
        bidPr: 228.18,
        askPr: 228.2,
        ts: 1790112451946,
      });
    });

    it('fetchSpotOrderBook parses bids and asks into float tuples', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        data: {
          asks: [
            ['228.17', '1.0475'],
            ['228.19', '2.5'],
          ],
          bids: [
            ['228.13', '3.125'],
            ['228.12', '4.0'],
          ],
          ts: '1790112456796',
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

      const book = await fetchSpotOrderBook('RNVDAUSDT', 2);
      expect(book.asks).toEqual([
        { price: 228.17, size: 1.0475 },
        { price: 228.19, size: 2.5 },
      ]);
      expect(book.bids).toEqual([
        { price: 228.13, size: 3.125 },
        { price: 228.12, size: 4.0 },
      ]);
      expect(book.ts).toBe(1790112456796);
    });

    it('fetchSpotCandles parses plain spot rows [tsMs, o, h, l, c, baseVol, quoteVol]', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        data: [
          [
            '1790006400000',
            '225.105',
            '229.6',
            '224.85',
            '228.49',
            '136790506.28',
            '31080435202.99',
          ],
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const candles = await fetchSpotCandles('RNVDAUSDT', 1);
      expect(candles).toHaveLength(1);
      expect(candles[0]).toEqual({
        tsMs: 1790006400000,
        open: 225.105,
        high: 229.6,
        low: 224.85,
        close: 228.49,
        vol: 136790506.28,
      });
    });

    it('fetchCurrentFunding parses fundingRate float and fundingRateInterval', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        data: [
          {
            symbol: 'NVDAUSDT',
            fundingRate: '0.000217',
            fundingRateInterval: '8',
            nextUpdate: '1790121600000',
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const funding = await fetchCurrentFunding('NVDAUSDT');
      expect(funding).toEqual({
        symbol: 'NVDAUSDT',
        fundingRate: 0.000217,
        fundingRateInterval: 8,
        nextUpdate: 1790121600000,
      });
    });

    it('fetchFundingHistory parses rows with fundingRate float and fundingTime ms', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        data: [
          { symbol: 'NVDAUSDT', fundingRate: '0.000236', fundingTime: '1790092800000' },
          { symbol: 'NVDAUSDT', fundingRate: '-0.00005', fundingTime: '1790064000000' },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const history = await fetchFundingHistory('NVDAUSDT', 2);
      expect(history).toEqual([
        { fundingRate: 0.000236, fundingTime: 1790092800000 },
        { fundingRate: -0.00005, fundingTime: 1790064000000 },
      ]);
    });

    it('fetchPerpCandles parses 1Dutc mix futures candles', async () => {
      const mockPayload = {
        code: '00000',
        msg: 'success',
        data: [
          ['1789948800000', '222.62', '228.63', '221.88', '227.46', '77010.42', '17306625.30'],
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockPayload,
        })
      );

      const candles = await fetchPerpCandles('NVDAUSDT', 1);
      expect(candles).toHaveLength(1);
      expect(candles[0]?.close).toBe(227.46);
      expect(candles[0]?.vol).toBe(77010.42);
    });
  });

  describe('code 40034 error path (no raw leak)', () => {
    it('throws typed BitgetError on code 40034 without leaking raw payload', async () => {
      const mockErrorEnvelope = {
        code: '40034',
        msg: 'Parameter RNVDAUSDT does not exist',
        requestTime: 1790112489246,
        data: null,
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockErrorEnvelope,
        })
      );

      try {
        await fetchCurrentFunding('RNVDAUSDT');
        expect.unreachable('Should have thrown BitgetError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BitgetError);
        const bitgetErr = err as BitgetError;
        expect(bitgetErr.code).toBe('40034');
        expect(bitgetErr.message).toContain('Parameter RNVDAUSDT does not exist');
        // Verify no raw leak: prototype and properties are typed
        expect(Object.keys(bitgetErr)).toContain('code');
        expect('data' in bitgetErr).toBe(false);
      }
    });
  });

  describe('timeout path', () => {
    it('catches TimeoutError and throws typed BitgetError with TIMEOUT code', async () => {
      const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(timeoutError)
      );

      try {
        await fetchSpotTicker('RNVDAUSDT');
        expect.unreachable('Should have thrown BitgetError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BitgetError);
        const bitgetErr = err as BitgetError;
        expect(bitgetErr.code).toBe('TIMEOUT');
        expect(bitgetErr.message).toContain('timed out');
      }
    });

    it('catches AbortError and throws typed BitgetError with TIMEOUT code', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(abortError)
      );

      try {
        await fetchSpotOrderBook('RNVDAUSDT');
        expect.unreachable('Should have thrown BitgetError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BitgetError);
        const bitgetErr = err as BitgetError;
        expect(bitgetErr.code).toBe('TIMEOUT');
      }
    });
  });

  describe('http error path', () => {
    it('throws typed BitgetError on non-200 HTTP status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        })
      );

      await expect(fetchSpotTicker('RNVDAUSDT')).rejects.toThrow(BitgetError);
    });
  });
});

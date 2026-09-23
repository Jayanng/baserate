import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchLiveDepthStress,
  clearDepthCache,
} from '@/src/data/live-market-snapshot';

describe('fetchLiveDepthStress integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearDepthCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearDepthCache();
  });

  describe('success path', () => {
    it('fetches spot order book, normalizes levels, and computes depth stress', async () => {
      const mockOrderBookEnvelope = {
        code: '00000',
        msg: 'success',
        data: {
          asks: [
            ['228.20', '10.0'], // 2282.00 USDT
            ['228.50', '20.0'], // 4570.00 USDT
          ],
          bids: [
            ['228.10', '10.0'],
            ['227.80', '20.0'],
          ],
          ts: '1790112456796',
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockOrderBookEnvelope,
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 1141, // 5 units @ 228.20
        referencePrice: 228.00,
      });

      expect(result.state).toBe('ok');
      expect(result.side).toBe('buy');
      expect(result.requestedNotionalUsdt).toBe(1141);
      expect(result.coveredNotionalUsdt).toBe(1141);
      expect(result.levelsConsumed).toBe(1);
      expect(result.observedAtUtc).toBe(new Date(1790112456796).toISOString());
      expect(result.reason).toBeNull();

      // VWAP = 228.20; ref = 228.00 => ((228.20 - 228.00) / 228.00) * 100
      const expectedSlippage = ((228.20 - 228.00) / 228.00) * 100;
      expect(result.estimatedVwapPct).not.toBeNull();
      expect(result.slippagePct).not.toBeNull();
      expect(Math.abs((result.slippagePct ?? 0) - expectedSlippage)).toBeLessThan(1e-6);
    });

    it('works with positional argument overload', async () => {
      const mockOrderBookEnvelope = {
        code: '00000',
        msg: 'success',
        data: {
          asks: [['228.20', '10.0']],
          bids: [['228.10', '10.0']],
          ts: '1790112456796',
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockOrderBookEnvelope,
        })
      );

      const result = await fetchLiveDepthStress(
        'RNVDAUSDT',
        'sell',
        1000,
        228.10
      );

      expect(result.state).toBe('ok');
      expect(result.side).toBe('sell');
      expect(result.requestedNotionalUsdt).toBe(1000);
    });
  });

  describe('unsupported asset skip', () => {
    it('skips network request entirely for non-allowlisted assets', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RDOGEUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 0.15,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.state).toBe('unavailable');
      expect(result.reason).toBe('asset not in replay allowlist');
      expect(result.coveredNotionalUsdt).toBeNull();
      expect(result.levelsConsumed).toBeNull();
      expect(result.estimatedVwapPct).toBeNull();
      expect(result.slippagePct).toBeNull();
    });
  });

  describe('timeout path', () => {
    it('catches abort / timeout errors and returns unavailable without throwing', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(result.observedAtUtc).toBeNull();
      expect(result.coveredNotionalUsdt).toBeNull();
      expect(result.levelsConsumed).toBeNull();
      expect(result.estimatedVwapPct).toBeNull();
      expect(result.slippagePct).toBeNull();
      expect(result.reason).toContain('timed out');
    });
  });

  describe('malformed response & empty/one-sided books', () => {
    it('returns unavailable on malformed orderbook envelope without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            code: '00000',
            msg: 'success',
            data: { asks: 'not-an-array', bids: [] },
          }),
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(typeof result.reason).toBe('string');
    });

    it('returns unavailable on empty asks for buy side without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            code: '00000',
            msg: 'success',
            data: { asks: [], bids: [['228.10', '10.0']], ts: '1790112456796' },
          }),
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(result.reason).toContain('asks are empty');
    });

    it('returns unavailable on empty bids for sell side without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            code: '00000',
            msg: 'success',
            data: { asks: [['228.20', '10.0']], bids: [], ts: '1790112456796' },
          }),
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'sell',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(result.reason).toContain('bids are empty');
    });

    it('returns unavailable on non-positive or non-numeric price/size without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            code: '00000',
            msg: 'success',
            data: {
              asks: [['-10.0', '5.0']],
              bids: [['228.10', '10.0']],
              ts: '1790112456796',
            },
          }),
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(result.reason).toContain('Invalid or non-positive');
    });

    it('returns unavailable on vendor 502 error without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        })
      );

      const result = await fetchLiveDepthStress({
        rTokenSymbol: 'RNVDAUSDT',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        referencePrice: 228.00,
      });

      expect(result.state).toBe('unavailable');
      expect(typeof result.reason).toBe('string');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchLiveMarketSnapshot,
  isReplayAllowlistAsset,
  isReplayAllowlistedSymbol,
} from '@/src/data/live-market-snapshot';

describe('live-market-snapshot module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('allowlist guards', () => {
    it('isReplayAllowlistAsset recognizes supported assets and rejects unsupported ones', () => {
      expect(isReplayAllowlistAsset('rNVDA')).toBe(true);
      expect(isReplayAllowlistAsset('rTSLA')).toBe(true);
      expect(isReplayAllowlistAsset('rAAPL')).toBe(true);
      expect(isReplayAllowlistAsset('rQQQ')).toBe(true);
      expect(isReplayAllowlistAsset('rMSTR')).toBe(true);
      expect(isReplayAllowlistAsset('RNVDA')).toBe(true);

      expect(isReplayAllowlistAsset('rDOGE')).toBe(false);
      expect(isReplayAllowlistAsset('BTC')).toBe(false);
      expect(isReplayAllowlistAsset('ETH')).toBe(false);
      expect(isReplayAllowlistAsset('')).toBe(false);
    });

    it('isReplayAllowlistedSymbol recognizes supported rTokens and perp symbols', () => {
      expect(isReplayAllowlistedSymbol('RNVDAUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('NVDAUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('RTSLAUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('TSLAUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('RAAPLUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('AAPLUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('RQQQUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('QQQUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('RMSTRUSDT')).toBe(true);
      expect(isReplayAllowlistedSymbol('MSTRUSDT')).toBe(true);

      expect(isReplayAllowlistedSymbol('RDOGEUSDT')).toBe(false);
      expect(isReplayAllowlistedSymbol('DOGEUSDT')).toBe(false);
      expect(isReplayAllowlistedSymbol('BTCUSDT')).toBe(false);
    });

    it('skips fetching entirely when asset is not in replay allowlist', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const result = await fetchLiveMarketSnapshot('RDOGEUSDT', 'DOGEUSDT');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.state).toBe('unavailable');
      expect(result.retrievedAtUtc).toBeNull();
      expect(result.spotPrice).toBeNull();
      expect(result.fundingRate).toBeNull();
      expect(result.sourceLabel).toEqual({
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      });
      expect(result.reason).toBe('asset not in replay allowlist');
    });
  });

  describe('success path', () => {
    it('returns live state with finite spot price and funding rate on valid envelope', async () => {
      const mockSpotEnvelope = {
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

      const mockFundingEnvelope = {
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
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/spot/market/tickers')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockSpotEnvelope,
            });
          }
          if (url.includes('/mix/market/current-fund-rate')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockFundingEnvelope,
            });
          }
          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        })
      );

      const before = Date.now();
      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');
      const after = Date.now();

      expect(snapshot.state).toBe('live');
      expect(snapshot.spotPrice).toBe(228.2);
      expect(snapshot.fundingRate).toBe(0.000217);
      expect(snapshot.sourceLabel).toEqual({
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      });
      expect(snapshot.reason).toBeNull();
      expect(snapshot.retrievedAtUtc).not.toBeNull();

      const retrievedTs = new Date(snapshot.retrievedAtUtc!).getTime();
      expect(retrievedTs).toBeGreaterThanOrEqual(before - 1000);
      expect(retrievedTs).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('degraded / failure paths', () => {
    it('returns unavailable on malformed ticker envelope without throwing', async () => {
      const mockMalformedSpot = {
        code: '00000',
        msg: 'success',
        data: [], // empty data array -> throws BitgetError
      };

      const mockFundingEnvelope = {
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
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/spot/market/tickers')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockMalformedSpot,
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockFundingEnvelope,
          });
        })
      );

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(snapshot.spotPrice).toBeNull();
      expect(snapshot.fundingRate).toBeNull();
      expect(snapshot.sourceLabel).toEqual({
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      });
      expect(typeof snapshot.reason).toBe('string');
      expect(snapshot.reason).toContain('No ticker data');
    });

    it('returns unavailable on timeout via AbortError without throwing', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(snapshot.spotPrice).toBeNull();
      expect(snapshot.fundingRate).toBeNull();
      expect(typeof snapshot.reason).toBe('string');
      expect(snapshot.reason).toContain('timed out');
    });

    it('returns unavailable on non-finite spot price without throwing', async () => {
      const mockNanSpot = {
        code: '00000',
        msg: 'success',
        data: [
          {
            symbol: 'RNVDAUSDT',
            lastPr: 'NaN',
            bidPr: '228.18',
            askPr: '228.2',
            ts: '1790112451946',
          },
        ],
      };

      const mockFundingEnvelope = {
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
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/spot/market/tickers')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockNanSpot,
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockFundingEnvelope,
          });
        })
      );

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.spotPrice).toBeNull();
      expect(snapshot.fundingRate).toBeNull();
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(typeof snapshot.reason).toBe('string');
      expect(snapshot.reason).toContain('Non-finite or invalid spot price');
    });

    it('returns unavailable on non-positive spot price without throwing', async () => {
      const mockNegativeSpot = {
        code: '00000',
        msg: 'success',
        data: [
          {
            symbol: 'RNVDAUSDT',
            lastPr: '-5.0',
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
          json: async () => mockNegativeSpot,
        })
      );

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.spotPrice).toBeNull();
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(snapshot.reason).toContain('Non-finite or invalid spot price');
    });

    it('returns unavailable on non-finite funding rate without throwing', async () => {
      const mockSpotEnvelope = {
        code: '00000',
        msg: 'success',
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

      const mockNanFunding = {
        code: '00000',
        msg: 'success',
        data: [
          {
            symbol: 'NVDAUSDT',
            fundingRate: 'undefined',
            fundingRateInterval: '8',
            nextUpdate: '1790121600000',
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/spot/market/tickers')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => mockSpotEnvelope,
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockNanFunding,
          });
        })
      );

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.fundingRate).toBeNull();
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(snapshot.reason).toContain('Non-finite funding rate');
    });

    it('returns unavailable on vendor HTTP error 502 without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        })
      );

      const snapshot = await fetchLiveMarketSnapshot('RNVDAUSDT', 'NVDAUSDT');

      expect(snapshot.state).toBe('unavailable');
      expect(snapshot.spotPrice).toBeNull();
      expect(snapshot.fundingRate).toBeNull();
      expect(snapshot.retrievedAtUtc).toBeNull();
      expect(typeof snapshot.reason).toBe('string');
    });
  });
});

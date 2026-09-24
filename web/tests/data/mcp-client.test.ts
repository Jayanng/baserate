import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchEventContext,
  isMcpAllowlistedSymbol,
  normalizeMcpSymbol,
  computeMondayReopen,
  toEarningsEvent,
  parseSseResponse,
  BITGET_MCP_ENDPOINT,
} from '@/src/data/mcp-client';

describe('mcp-client module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('allowlist guards & normalization', () => {
    it('normalizes symbols correctly', () => {
      expect(normalizeMcpSymbol('rNVDA')).toBe('NVDA');
      expect(normalizeMcpSymbol('RNVDAUSDT')).toBe('NVDA');
      expect(normalizeMcpSymbol('NVDAUSDT')).toBe('NVDA');
      expect(normalizeMcpSymbol('$TSLA')).toBe('TSLA');
      expect(normalizeMcpSymbol('#AAPL')).toBe('AAPL');
      expect(normalizeMcpSymbol('rQQQ')).toBe('QQQ');
      expect(normalizeMcpSymbol('RMSTRUSDT')).toBe('MSTR');
    });

    it('isMcpAllowlistedSymbol accepts the 5 replay assets and rejects others', () => {
      expect(isMcpAllowlistedSymbol('NVDA')).toBe(true);
      expect(isMcpAllowlistedSymbol('TSLA')).toBe(true);
      expect(isMcpAllowlistedSymbol('AAPL')).toBe(true);
      expect(isMcpAllowlistedSymbol('QQQ')).toBe(true);
      expect(isMcpAllowlistedSymbol('MSTR')).toBe(true);
      expect(isMcpAllowlistedSymbol('rNVDA')).toBe(true);
      expect(isMcpAllowlistedSymbol('RNVDAUSDT')).toBe(true);

      expect(isMcpAllowlistedSymbol('BTC')).toBe(false);
      expect(isMcpAllowlistedSymbol('ETH')).toBe(false);
      expect(isMcpAllowlistedSymbol('DOGE')).toBe(false);
      expect(isMcpAllowlistedSymbol('')).toBe(false);
    });

    it('skips network fetch entirely when asset is not in replay allowlist', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const result = await fetchEventContext('DOGE', monday);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.state).toBe('unavailable');
      expect(result.retrievedAtUtc).toBeNull();
      expect(result.symbol).toBeNull();
      expect(result.nextEarningsDate).toBeNull();
      expect(result.daysUntilEarnings).toBeNull();
      expect(result.withinSevenDaysOfReopen).toBeNull();
      expect(result.reason).toBe('asset not in replay allowlist');
    });
  });

  describe('computeMondayReopen helper', () => {
    it('computes next Monday 13:30 UTC from a Friday date', () => {
      // 2026-09-25 is Friday
      const friday = new Date('2026-09-25T20:00:00.000Z');
      const monday = computeMondayReopen(friday);
      expect(monday.toISOString()).toBe('2026-09-28T13:30:00.000Z');
    });

    it('computes next Monday 13:30 UTC from a Sunday date', () => {
      // 2026-09-27 is Sunday
      const sunday = new Date('2026-09-27T10:00:00.000Z');
      const monday = computeMondayReopen(sunday);
      expect(monday.toISOString()).toBe('2026-09-28T13:30:00.000Z');
    });

    it('computes next Monday 13:30 UTC from today when reference is null', () => {
      const monday = computeMondayReopen(null);
      expect(monday.getUTCDay()).toBe(1); // Monday
      expect(monday.getUTCHours()).toBe(13);
      expect(monday.getUTCMinutes()).toBe(30);
    });
  });

  describe('toEarningsEvent & parseSseResponse helpers', () => {
    it('parses SSE response data line correctly', () => {
      const sseText =
        'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[{"text":"test"}]}}\n\n';
      const parsed = parseSseResponse(sseText) as {
        jsonrpc: string;
        id: number;
      };
      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.id).toBe(2);
    });

    it('extracts after hours and disclosure fields correctly', () => {
      const event = toEarningsEvent({
        period_ending: '2026-07-29',
        fiscal_year: '2027',
        perf_briefing_fore_dsclsr_date: '2026-08-25',
        is_trading_time: '盘后',
      });
      expect(event.periodEnding).toBe('2026-07-29');
      expect(event.fiscalYear).toBe('2027');
      expect(event.nextDisclosureDate).toBe('2026-08-25');
      expect(event.reportedAfterHours).toBe(true);
    });
  });

  describe('success paths', () => {
    it('completes 3-step MCP initialize->notify->call flow with session header and selects earliest upcoming date', async () => {
      const mockInitHeaders = new Headers({
        'content-type': 'text/event-stream',
        'mcp-session-id': 'sess-test-12345',
      });

      const mockInitBody =
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{},"serverInfo":{"name":"bitget-mcp-server","version":"4.0.5"}}}\n\n';

      const mockCalendarResults = [
        // Date far in future
        {
          symbol: 'NVDA',
          period_ending: '2026-10-25',
          perf_briefing_fore_dsclsr_date: '2026-12-15',
          is_trading_time: '盘后',
        },
        // Earliest date >= referenceNow (2026-10-23) -> 2026-11-19
        {
          symbol: 'NVDA',
          period_ending: '2026-07-25',
          perf_briefing_fore_dsclsr_date: '2026-11-19',
          is_trading_time: '盘后',
        },
        // Past date < referenceNow
        {
          symbol: 'NVDA',
          period_ending: '2026-04-25',
          perf_briefing_fore_dsclsr_date: '2026-05-19',
          is_trading_time: '盘后',
        },
      ];

      const mockCallBody = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                status_code: 200,
                data: { results: mockCalendarResults },
              }),
            },
          ],
          isError: false,
          structuredContent: {
            success: true,
            status_code: 200,
            data: { results: mockCalendarResults },
          },
        },
      })}\n\n`;

      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        expect(url).toBe(BITGET_MCP_ENDPOINT);
        const bodyStr = String(init?.body ?? '');

        if (bodyStr.includes('"method":"initialize"')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: mockInitHeaders,
            text: async () => mockInitBody,
          });
        }
        if (bodyStr.includes('"method":"notifications/initialized"')) {
          expect(
            (init?.headers as Record<string, string>)?.['mcp-session-id']
          ).toBe('sess-test-12345');
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => '',
          });
        }
        if (bodyStr.includes('"method":"tools/call"')) {
          expect(
            (init?.headers as Record<string, string>)?.['mcp-session-id']
          ).toBe('sess-test-12345');
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'text/event-stream' }),
            text: async () => mockCallBody,
          });
        }
        return Promise.reject(new Error(`Unexpected call: ${bodyStr}`));
      });

      vi.stubGlobal('fetch', fetchMock);

      const refNow = new Date('2026-10-23T10:00:00.000Z');
      // Monday reopen is 2026-11-16 (within 7 days of Nov 19)
      const mondayReopen = new Date('2026-11-16T13:30:00.000Z');

      const res = await fetchEventContext('rNVDA', mondayReopen, 5000, refNow);

      expect(res.state).toBe('live');
      expect(res.symbol).toBe('NVDA');
      expect(res.nextEarningsDate).toBe('2026-11-19');
      expect(res.daysUntilEarnings).toBe(27);
      expect(res.withinSevenDaysOfReopen).toBe(true);
      expect(res.reason).toBeNull();
      expect(res.retrievedAtUtc).not.toBeNull();
    });

    it('returns state live with nextEarningsDate null for legitimate empty results (e.g. QQQ ETF 204)', async () => {
      const mockInitHeaders = new Headers({
        'content-type': 'text/event-stream',
        'mcp-session-id': 'sess-qqq-204',
      });

      const mockCallBody = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                status_code: 204,
                data: '',
                error: null,
              }),
            },
          ],
          isError: false,
          structuredContent: {
            success: true,
            status_code: 204,
            data: '',
            error: null,
          },
        },
      })}\n\n`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          const bodyStr = String(init?.body ?? '');
          if (bodyStr.includes('"method":"initialize"')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: mockInitHeaders,
              text: async () => 'event: message\ndata: {"result":{}}\n\n',
            });
          }
          if (bodyStr.includes('"method":"notifications/initialized"')) {
            return Promise.resolve({ ok: true, status: 200, text: async () => '' });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCallBody,
          });
        })
      );

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('QQQ', monday);

      expect(res.state).toBe('live');
      expect(res.symbol).toBe('QQQ');
      expect(res.nextEarningsDate).toBeNull();
      expect(res.daysUntilEarnings).toBeNull();
      expect(res.withinSevenDaysOfReopen).toBeNull();
      expect(res.reason).toBeNull();
    });

    it('returns state live with nextEarningsDate null when all calendar dates are in the past', async () => {
      const mockInitHeaders = new Headers({
        'mcp-session-id': 'sess-past-only',
      });

      const mockCalendarResults = [
        {
          symbol: 'NVDA',
          period_ending: '2024-01-27',
          perf_briefing_fore_dsclsr_date: '2024-02-20',
        },
      ];

      const mockCallBody = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: {
          structuredContent: {
            data: { results: mockCalendarResults },
          },
        },
      })}\n\n`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          const bodyStr = String(init?.body ?? '');
          if (bodyStr.includes('"method":"initialize"')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: mockInitHeaders,
              text: async () => 'event: message\ndata: {"result":{}}\n\n',
            });
          }
          if (bodyStr.includes('"method":"notifications/initialized"')) {
            return Promise.resolve({ ok: true, status: 200, text: async () => '' });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCallBody,
          });
        })
      );

      const refNow = new Date('2026-09-24T00:00:00.000Z');
      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday, 5000, refNow);

      expect(res.state).toBe('live');
      expect(res.symbol).toBe('NVDA');
      expect(res.nextEarningsDate).toBeNull();
      expect(res.daysUntilEarnings).toBeNull();
      expect(res.withinSevenDaysOfReopen).toBeNull();
      expect(res.reason).toBeNull();
    });
  });

  describe('degraded and failure paths (never throws)', () => {
    it('returns unavailable when initialize returns non-200 HTTP status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
      );

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday);

      expect(res.state).toBe('unavailable');
      expect(res.nextEarningsDate).toBeNull();
      expect(res.reason).toContain('HTTP 503');
    });

    it('returns unavailable when mcp-session-id header is missing from initialize response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(), // empty headers, no mcp-session-id
          text: async () => 'event: message\ndata: {"result":{}}\n\n',
        })
      );

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday);

      expect(res.state).toBe('unavailable');
      expect(res.reason).toContain('Missing mcp-session-id response header');
    });

    it('returns unavailable on timeout via AbortError without throwing', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday, 100);

      expect(res.state).toBe('unavailable');
      expect(res.nextEarningsDate).toBeNull();
      expect(res.reason).toContain('timed out');
    });

    it('returns unavailable on malformed SSE without throwing', async () => {
      const mockInitHeaders = new Headers({
        'mcp-session-id': 'sess-malformed',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          const bodyStr = String(init?.body ?? '');
          if (bodyStr.includes('"method":"initialize"')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: mockInitHeaders,
              text: async () => 'event: message\ndata: {"result":{}}\n\n',
            });
          }
          if (bodyStr.includes('"method":"notifications/initialized"')) {
            return Promise.resolve({ ok: true, status: 200, text: async () => '' });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => 'data: not valid json here!!!',
          });
        })
      );

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday);

      expect(res.state).toBe('unavailable');
      expect(res.reason).toContain('Malformed MCP response');
    });

    it('returns unavailable on JSON-RPC error payload', async () => {
      const mockInitHeaders = new Headers({
        'mcp-session-id': 'sess-rpc-err',
      });

      const mockCallBody = `event: message\ndata: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        error: { code: -32603, message: 'Internal server error in equity query' },
      })}\n\n`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          const bodyStr = String(init?.body ?? '');
          if (bodyStr.includes('"method":"initialize"')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              headers: mockInitHeaders,
              text: async () => 'event: message\ndata: {"result":{}}\n\n',
            });
          }
          if (bodyStr.includes('"method":"notifications/initialized"')) {
            return Promise.resolve({ ok: true, status: 200, text: async () => '' });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCallBody,
          });
        })
      );

      const monday = new Date('2026-09-28T13:30:00.000Z');
      const res = await fetchEventContext('NVDA', monday);

      expect(res.state).toBe('unavailable');
      expect(res.reason).toContain('Internal server error in equity query');
    });
  });
});

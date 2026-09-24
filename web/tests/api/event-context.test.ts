import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/event-context/route';
import * as mcpClient from '@/src/data/mcp-client';
import type { McpEventContext } from '@/src/data/mcp-client';

describe('POST /api/event-context', () => {
  const mockLiveEvent: McpEventContext = {
    state: 'live',
    retrievedAtUtc: '2026-09-24T06:00:00.000Z',
    symbol: 'NVDA',
    nextEarningsDate: '2026-11-19',
    daysUntilEarnings: 56,
    withinSevenDaysOfReopen: true,
    reason: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('invalid symbol -> HTTP 400 with unsupported_symbol', () => {
    it('rejects unsupported symbol BTC with 400 and unsupported_symbol', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTC' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });

    it('rejects unsupported symbol DOGE with 400 and unsupported_symbol', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'DOGE' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });

    it('rejects empty symbol string with 400', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: '' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });

    it('rejects missing symbol property with 400', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });

    it('rejects non-string symbol with 400', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 12345 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });

    it('rejects malformed JSON body with 400', async () => {
      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'unsupported_symbol',
      });
    });
  });

  describe('success shape -> HTTP 200 with { ok: true, event }', () => {
    it('returns event context for clean symbol NVDA', async () => {
      const spy = vi
        .spyOn(mcpClient, 'fetchEventContext')
        .mockResolvedValueOnce(mockLiveEvent);

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NVDA' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: true,
        event: mockLiveEvent,
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]?.[0]).toBe('NVDA');
      expect(spy.mock.calls[0]?.[1]).toBeInstanceOf(Date);
    });

    it('strips r prefix and USDT suffix from symbol (e.g. rNVDA, RNVDAUSDT)', async () => {
      const spy = vi
        .spyOn(mcpClient, 'fetchEventContext')
        .mockResolvedValueOnce(mockLiveEvent);

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'rNVDAUSDT' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]?.[0]).toBe('NVDA');
    });

    it('accepts other replay allowlisted symbols: TSLA, AAPL, QQQ, MSTR', async () => {
      for (const sym of ['TSLA', 'AAPL', 'QQQ', 'MSTR']) {
        const spy = vi
          .spyOn(mcpClient, 'fetchEventContext')
          .mockResolvedValueOnce({
            ...mockLiveEvent,
            symbol: sym,
          });

        const req = new Request('http://localhost:3000/api/event-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: `r${sym}` }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(spy).toHaveBeenCalledWith(sym, expect.any(Date));
      }
    });

    it('returns ok: true with event when MCP client returns empty earnings (QQQ ETF)', async () => {
      const emptyEvent: McpEventContext = {
        state: 'live',
        retrievedAtUtc: '2026-09-24T06:00:00.000Z',
        symbol: 'QQQ',
        nextEarningsDate: null,
        daysUntilEarnings: null,
        withinSevenDaysOfReopen: null,
        reason: null,
      };

      vi.spyOn(mcpClient, 'fetchEventContext').mockResolvedValueOnce(emptyEvent);

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'QQQ' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: true,
        event: emptyEvent,
      });
    });
  });

  describe('internal failure -> HTTP 200 with { ok: false, reason }', () => {
    it('returns HTTP 200 with ok: false when fetchEventContext throws an Error', async () => {
      vi.spyOn(mcpClient, 'fetchEventContext').mockRejectedValueOnce(
        new Error('Bitget MCP upstream unavailable')
      );

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NVDA' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'Bitget MCP upstream unavailable',
      });
    });

    it('returns HTTP 200 with ok: false when fetchEventContext rejects with non-Error', async () => {
      vi.spyOn(mcpClient, 'fetchEventContext').mockRejectedValueOnce(
        'Unknown connection crash'
      );

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NVDA' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(typeof data.reason).toBe('string');
    });
  });

  describe('queryType: sentiment dispatch', () => {
    const mockSentiment: mcpClient.MarketSentimentResult = {
      state: 'live',
      retrievedAtUtc: '2026-09-24T06:00:00.000Z',
      score: 34.7,
      rating: 'fear',
      previousClose: 35.2,
      previous1Month: 54.7,
      reason: null,
    };

    it('returns sentiment when queryType is sentiment without requiring symbol', async () => {
      const spy = vi
        .spyOn(mcpClient, 'fetchMarketSentiment')
        .mockResolvedValueOnce(mockSentiment);

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryType: 'sentiment' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: true,
        sentiment: mockSentiment,
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns HTTP 200 with ok: false when fetchMarketSentiment throws an Error', async () => {
      vi.spyOn(mcpClient, 'fetchMarketSentiment').mockRejectedValueOnce(
        new Error('Upstream sentiment signal failed')
      );

      const req = new Request('http://localhost:3000/api/event-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryType: 'sentiment' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        ok: false,
        reason: 'Upstream sentiment signal failed',
      });
    });
  });
});

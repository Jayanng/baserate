/**
 * BaseRate Bitget MCP Client Module
 * Read-only client for querying bitget-mcp-server event context.
 *
 * Rules:
 * - Public Bitget MCP endpoint: https://agent.bitget.com/mcp
 * - JSON-RPC 2.0 over HTTP with session handling via mcp-session-id header
 * - Strict TS, zero any, zero non-null assertions
 * - Never throws to caller: returns state 'unavailable' on any failure
 * - Never fabricates values
 * - Bounded by timeout (default 5000ms) with AbortController
 * - Allowlist guard: only calls for the 5 replay assets (NVDA, TSLA, AAPL, QQQ, MSTR)
 */

export const BITGET_MCP_ENDPOINT = 'https://agent.bitget.com/mcp';

export interface EarningsEvent {
  periodEnding: string;
  nextDisclosureDate: string | null;
  fiscalYear: string | null;
  reportedAfterHours: boolean | null;
}

export interface McpEventContext {
  state: 'live' | 'unavailable';
  retrievedAtUtc: string | null;
  symbol: string | null;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
  withinSevenDaysOfReopen: boolean | null;
  reason: string | null;
}

export interface MarketSentimentResult {
  state: 'live' | 'unavailable';
  retrievedAtUtc: string | null;
  score: number | null;
  rating: string | null;
  previousClose: number | null;
  previous1Month: number | null;
  reason: string | null;
}

export const MCP_ALLOWLIST_SYMBOLS = [
  'NVDA',
  'TSLA',
  'AAPL',
  'QQQ',
  'MSTR',
] as const;

export function normalizeMcpSymbol(rawSymbol: string): string {
  return rawSymbol
    .replace(/^[$#]/, '')
    .replace(/^r/i, '')
    .replace(/USDT$/i, '')
    .trim()
    .toUpperCase();
}

export function isMcpAllowlistedSymbol(symbol: string): boolean {
  const clean = normalizeMcpSymbol(symbol);
  return MCP_ALLOWLIST_SYMBOLS.some((allowed) => allowed === clean);
}

export interface RawEquityCalendarEntry {
  symbol?: unknown;
  period_ending?: unknown;
  fiscal_year?: unknown;
  name?: unknown;
  perf_briefing_fore_dsclsr_date?: unknown;
  perf_brief_dsclsr_date?: unknown;
  perf_report_dsclsr_date?: unknown;
  is_trading_time?: unknown;
  [key: string]: unknown;
}

export function extractDisclosureDate(item: RawEquityCalendarEntry): string | null {
  if (
    typeof item.perf_briefing_fore_dsclsr_date === 'string' &&
    item.perf_briefing_fore_dsclsr_date.trim()
  ) {
    return item.perf_briefing_fore_dsclsr_date.trim();
  }
  if (
    typeof item.perf_brief_dsclsr_date === 'string' &&
    item.perf_brief_dsclsr_date.trim()
  ) {
    return item.perf_brief_dsclsr_date.trim();
  }
  if (
    typeof item.perf_report_dsclsr_date === 'string' &&
    item.perf_report_dsclsr_date.trim()
  ) {
    return item.perf_report_dsclsr_date.trim();
  }
  if (
    typeof item.period_ending === 'string' &&
    item.period_ending.trim()
  ) {
    return item.period_ending.trim();
  }
  return null;
}

export function toEarningsEvent(item: RawEquityCalendarEntry): EarningsEvent {
  const periodEnding =
    typeof item.period_ending === 'string' ? item.period_ending.trim() : '';
  const nextDisclosureDate = extractDisclosureDate(item);
  const fiscalYear =
    typeof item.fiscal_year === 'string' ? item.fiscal_year.trim() : null;

  let reportedAfterHours: boolean | null = null;
  if (typeof item.is_trading_time === 'string') {
    const timeStr = item.is_trading_time.toLowerCase();
    if (
      timeStr.includes('盘后') ||
      timeStr.includes('after') ||
      timeStr.includes('post')
    ) {
      reportedAfterHours = true;
    } else if (
      timeStr.includes('盘前') ||
      timeStr.includes('pre')
    ) {
      reportedAfterHours = false;
    }
  }

  return {
    periodEnding,
    nextDisclosureDate,
    fiscalYear,
    reportedAfterHours,
  };
}

/**
 * Parses Server-Sent Events (SSE) formatted text.
 * Splits on lines starting with 'data:', extracts the JSON payload from the last complete data line.
 */
export function parseSseResponse(text: string): unknown {
  const lines = text.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    // If not SSE-wrapped, try parsing as regular JSON
    return JSON.parse(text);
  }

  const lastLine = dataLines[dataLines.length - 1];
  if (!lastLine) {
    throw new Error('Empty data line in SSE response');
  }
  return JSON.parse(lastLine);
}

/**
 * Computes next Monday 13:30 UTC from a reference date (e.g. dossier Friday date) if provided,
 * otherwise from current date.
 */
export function computeMondayReopen(fromRef?: string | Date | null): Date {
  const base = fromRef ? new Date(fromRef) : new Date();
  const validBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const currentDay = validBase.getUTCDay(); // 0 is Sun, 1 is Mon, 5 is Fri, 6 is Sat
  const daysUntilMonday = ((8 - currentDay) % 7) || 7;
  return new Date(
    Date.UTC(
      validBase.getUTCFullYear(),
      validBase.getUTCMonth(),
      validBase.getUTCDate() + daysUntilMonday,
      13,
      30,
      0,
      0
    )
  );
}

interface RawMcpResponseEnvelope {
  jsonrpc?: string;
  id?: number | string;
  result?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    isError?: boolean;
    structuredContent?: {
      success?: boolean;
      status_code?: number;
      data?: {
        results?: unknown[];
      } | string | unknown;
      error?: unknown;
    };
  };
  error?: {
    code?: number;
    message?: string;
  };
}

function extractResultsArray(envelope: RawMcpResponseEnvelope | unknown): unknown[] {
  if (!envelope || typeof envelope !== 'object') {
    return [];
  }
  const env = envelope as RawMcpResponseEnvelope & { data?: unknown; results?: unknown };

  // Option 1: structuredContent.data.results or structuredContent.data === ""
  const structured = env.result?.structuredContent;
  if (structured) {
    if (typeof structured.data === 'string' && structured.data === '') {
      return [];
    }
    if (
      structured.data &&
      typeof structured.data === 'object' &&
      'results' in structured.data &&
      Array.isArray((structured.data as { results: unknown[] }).results)
    ) {
      return (structured.data as { results: unknown[] }).results;
    }
  }

  // Option 2: content[0].text parsed as JSON
  const contentText = env.result?.content?.[0]?.text;
  if (contentText && typeof contentText === 'string') {
    try {
      const parsed = JSON.parse(contentText) as {
        data?: { results?: unknown[] } | string;
        results?: unknown[];
      };
      if (typeof parsed.data === 'string' && parsed.data === '') {
        return [];
      }
      if (
        parsed.data &&
        typeof parsed.data === 'object' &&
        'results' in parsed.data &&
        Array.isArray((parsed.data as { results: unknown[] }).results)
      ) {
        return (parsed.data as { results: unknown[] }).results;
      }
      if (Array.isArray(parsed.results)) {
        return parsed.results;
      }
    } catch {
      // Content text is not JSON, ignore
    }
  }

  // Option 3: direct envelope.data.results
  if (
    env.data &&
    typeof env.data === 'object' &&
    'results' in env.data &&
    Array.isArray((env.data as { results: unknown[] }).results)
  ) {
    return (env.data as { results: unknown[] }).results;
  }

  // Option 4: direct envelope.results
  if (Array.isArray(env.results)) {
    return env.results;
  }

  return [];
}

/**
 * Fetches event calendar context from bitget-mcp-server for an allowlisted asset.
 *
 * Rules:
 * - Allowlist guard: only queries NVDA, TSLA, AAPL, QQQ, MSTR
 * - 5s bounded timeout with AbortController
 * - Fails closed: never throws, never fabricates
 * - Legitimate empty results (e.g. QQQ ETF): returns state 'live' with nextEarningsDate null
 */
export async function fetchEventContext(
  symbol: string,
  mondayReopenDate: Date,
  timeoutMs: number = 5000,
  referenceNow: Date = new Date()
): Promise<McpEventContext> {
  const cleanSymbol = normalizeMcpSymbol(symbol);

  if (!isMcpAllowlistedSymbol(cleanSymbol)) {
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      symbol: null,
      nextEarningsDate: null,
      daysUntilEarnings: null,
      withinSevenDaysOfReopen: null,
      reason: 'asset not in replay allowlist',
    };
  }

  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Bitget MCP request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
      reject(
        new DOMException(
          `Bitget MCP request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
    }, timeoutMs);
  });

  try {
    const doFetchFlow = async (): Promise<McpEventContext> => {
      // 1. POST initialize
      const initRes = await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'baserate', version: '1.0' },
          },
        }),
      });

      if (!initRes.ok) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: `Bitget MCP initialize returned HTTP ${initRes.status}`,
        };
      }

      const sessionId = initRes.headers.get('mcp-session-id');
      if (!sessionId || !sessionId.trim()) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: 'Missing mcp-session-id response header from Bitget MCP initialize',
        };
      }

      // 2. POST notifications/initialized
      await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId.trim(),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      // 3. POST tools/call for equity_calendar
      const queryRes = await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId.trim(),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'do_query',
            arguments: {
              entry_id: 'equity_calendar',
              params: { symbol: cleanSymbol },
            },
          },
        }),
      });

      if (!queryRes.ok) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: `Bitget MCP do_query returned HTTP ${queryRes.status}`,
        };
      }

      const rawText = await queryRes.text();
      let parsedEnvelope: RawMcpResponseEnvelope;
      try {
        parsedEnvelope = parseSseResponse(rawText) as RawMcpResponseEnvelope;
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error
            ? parseErr.message
            : 'Failed to parse MCP response as SSE JSON';
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: `Malformed MCP response: ${msg}`,
        };
      }

      if (parsedEnvelope.error) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason:
            parsedEnvelope.error.message ?? 'Bitget MCP returned JSON-RPC error',
        };
      }

      if (parsedEnvelope.result?.isError === true) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: 'Bitget MCP tools/call reported execution error',
        };
      }

      const results = extractResultsArray(parsedEnvelope);

      // Legitimate empty results (e.g. QQQ ETF has no earnings):
      // return state live with nextEarningsDate null and reason null
      if (results.length === 0) {
        return {
          state: 'live',
          retrievedAtUtc: new Date().toISOString(),
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: null,
        };
      }

      // Filter and pick the entry whose disclosure date is earliest date >= today
      const todayIso = referenceNow.toISOString().slice(0, 10);
      const todayMidnightTime = new Date(
        Date.UTC(
          referenceNow.getUTCFullYear(),
          referenceNow.getUTCMonth(),
          referenceNow.getUTCDate(),
          0,
          0,
          0,
          0
        )
      ).getTime();

      interface CandidateEvent {
        disclosureDate: string;
        item: RawEquityCalendarEntry;
      }

      const candidates: CandidateEvent[] = [];
      for (const raw of results) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as RawEquityCalendarEntry;
        const dateStr = extractDisclosureDate(entry);
        if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          const cleanDate = dateStr.slice(0, 10);
          if (cleanDate >= todayIso) {
            candidates.push({ disclosureDate: cleanDate, item: entry });
          }
        }
      }

      if (candidates.length === 0) {
        // Results returned from vendor, but none scheduled on or after today
        return {
          state: 'live',
          retrievedAtUtc: new Date().toISOString(),
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: null,
        };
      }

      // Sort ascending to get earliest disclosure date >= today
      candidates.sort((a, b) =>
        a.disclosureDate.localeCompare(b.disclosureDate)
      );

      const earliest = candidates[0];
      if (!earliest) {
        return {
          state: 'live',
          retrievedAtUtc: new Date().toISOString(),
          symbol: cleanSymbol,
          nextEarningsDate: null,
          daysUntilEarnings: null,
          withinSevenDaysOfReopen: null,
          reason: null,
        };
      }

      const nextEarningsDate = earliest.disclosureDate;
      const earningsTime = new Date(`${nextEarningsDate}T00:00:00Z`).getTime();
      const daysUntilEarnings = Math.max(
        0,
        Math.ceil((earningsTime - todayMidnightTime) / 86400000)
      );

      const mondayReopenTime = mondayReopenDate.getTime();
      const reopenPlus7Days = mondayReopenTime + 7 * 86400000;
      const withinSevenDaysOfReopen =
        earningsTime <= reopenPlus7Days && earningsTime >= todayMidnightTime;

      return {
        state: 'live',
        retrievedAtUtc: new Date().toISOString(),
        symbol: cleanSymbol,
        nextEarningsDate,
        daysUntilEarnings,
        withinSevenDaysOfReopen,
        reason: null,
      };
    };

    const res = await Promise.race([doFetchFlow(), timeoutPromise]);
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    return res;
  } catch (err: unknown) {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    const isTimeout =
      (err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
      controller.signal.aborted;
    const reason = isTimeout
      ? `Bitget MCP request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : 'Unknown Bitget MCP fetch error';
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      symbol: cleanSymbol,
      nextEarningsDate: null,
      daysUntilEarnings: null,
      withinSevenDaysOfReopen: null,
      reason,
    };
  }
}

export function roundOneDecimal(val: unknown): number | null {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return Math.round((val + Number.EPSILON) * 10) / 10;
  }
  return null;
}

export interface RawSentimentEntry {
  score?: unknown;
  rating?: unknown;
  timestamp?: unknown;
  previous_close?: unknown;
  previousClose?: unknown;
  previous_1_week?: unknown;
  previous_1_month?: unknown;
  previous1Month?: unknown;
  [key: string]: unknown;
}

/**
 * Fetches market sentiment (Fear & Greed Index) from bitget-signal MCP.
 *
 * Rules:
 * - Public Bitget MCP endpoint: https://agent.bitget.com/mcp
 * - Entry ID: sentiment_market_fear_greed, empty params {}
 * - Global signal: no symbol allowlist required
 * - 5s bounded timeout with AbortController
 * - Fails closed: never throws, never fabricates
 * - Score and previous values rounded to 1 decimal place
 */
export async function fetchMarketSentiment(
  timeoutMs: number = 5000
): Promise<MarketSentimentResult> {
  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Bitget MCP request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
      reject(
        new DOMException(
          `Bitget MCP request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
    }, timeoutMs);
  });

  try {
    const doFetchFlow = async (): Promise<MarketSentimentResult> => {
      // 1. POST initialize
      const initRes = await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'baserate', version: '1.0' },
          },
        }),
      });

      if (!initRes.ok) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: `Bitget MCP initialize returned HTTP ${initRes.status}`,
        };
      }

      const sessionId = initRes.headers.get('mcp-session-id');
      if (!sessionId || !sessionId.trim()) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason:
            'Missing mcp-session-id response header from Bitget MCP initialize',
        };
      }

      // 2. POST notifications/initialized
      await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId.trim(),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      // 3. POST tools/call for sentiment_market_fear_greed
      const queryRes = await fetch(BITGET_MCP_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId.trim(),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'do_query',
            arguments: {
              entry_id: 'sentiment_market_fear_greed',
              params: {},
            },
          },
        }),
      });

      if (!queryRes.ok) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: `Bitget MCP do_query returned HTTP ${queryRes.status}`,
        };
      }

      const rawText = await queryRes.text();
      let parsedEnvelope: unknown;
      try {
        parsedEnvelope = parseSseResponse(rawText);
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error
            ? parseErr.message
            : 'Failed to parse MCP response as SSE JSON';
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: `Malformed MCP response: ${msg}`,
        };
      }

      if (parsedEnvelope && typeof parsedEnvelope === 'object') {
        const env = parsedEnvelope as RawMcpResponseEnvelope;
        if (env.error) {
          return {
            state: 'unavailable',
            retrievedAtUtc: null,
            score: null,
            rating: null,
            previousClose: null,
            previous1Month: null,
            reason: env.error.message ?? 'Bitget MCP returned JSON-RPC error',
          };
        }

        if (env.result?.isError === true) {
          return {
            state: 'unavailable',
            retrievedAtUtc: null,
            score: null,
            rating: null,
            previousClose: null,
            previous1Month: null,
            reason: 'Bitget MCP tools/call reported execution error',
          };
        }
      }

      const results = extractResultsArray(parsedEnvelope);
      if (results.length === 0) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: 'Empty sentiment results from Bitget MCP',
        };
      }

      const first = results[0];
      if (!first || typeof first !== 'object') {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: 'Malformed sentiment entry in Bitget MCP response',
        };
      }

      const entry = first as RawSentimentEntry;
      const score = roundOneDecimal(entry.score);
      const rating =
        typeof entry.rating === 'string' && entry.rating.trim()
          ? entry.rating.trim()
          : null;
      const previousClose = roundOneDecimal(
        entry.previous_close ?? entry.previousClose
      );
      const previous1Month = roundOneDecimal(
        entry.previous_1_month ?? entry.previous1Month
      );

      if (score === null || rating === null) {
        return {
          state: 'unavailable',
          retrievedAtUtc: null,
          score: null,
          rating: null,
          previousClose: null,
          previous1Month: null,
          reason: 'Missing score or rating in Bitget MCP sentiment response',
        };
      }

      return {
        state: 'live',
        retrievedAtUtc: new Date().toISOString(),
        score,
        rating,
        previousClose,
        previous1Month,
        reason: null,
      };
    };

    const res = await Promise.race([doFetchFlow(), timeoutPromise]);
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    return res;
  } catch (err: unknown) {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    const isTimeout =
      (err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
      controller.signal.aborted;
    const reason = isTimeout
      ? `Bitget MCP request timed out after ${timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : 'Unknown Bitget MCP fetch error';
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      score: null,
      rating: null,
      previousClose: null,
      previous1Month: null,
      reason,
    };
  }
}

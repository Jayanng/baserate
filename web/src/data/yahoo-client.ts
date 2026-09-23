/**
 * BaseRate Yahoo Finance Native History Client
 * Read-only keyless history client for deep underlying stock regime data.
 *
 * Rules:
 * - 12s timeout via AbortSignal.timeout(12000)
 * - Ticker allowlist strictly enforced: NVDA, TSLA, AAPL, QQQ, MSTR (mirror of ASSET_MAP perps)
 * - Validates chart.error is null
 * - Skips null close observations (holidays, trading halts)
 * - No raw vendor payloads leak outside the data layer
 */

export const YAHOO_BASE = 'https://query1.finance.yahoo.com';

export const ALLOWED_YAHOO_TICKERS = ['NVDA', 'TSLA', 'AAPL', 'QQQ', 'MSTR'] as const;
export type AllowedYahooTicker = (typeof ALLOWED_YAHOO_TICKERS)[number];

export class YahooError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`Yahoo Finance error [${code}]: ${message}`);
    this.name = 'YahooError';
    this.code = code;
    Object.setPrototypeOf(this, YahooError.prototype);
  }
}

export interface YahooCandle {
  tsMs: number;
  close: number;
}

export interface YahooHistoryResult {
  candles: YahooCandle[];
  firstDateIso: string;
  lastDateIso: string;
  count: number;
}

interface RawYahooChartResponse {
  chart: {
    result: Array<{
      meta?: Record<string, unknown>;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
        }>;
      };
    }> | null;
    error: {
      code?: string;
      description?: string;
    } | null;
  };
}

/**
 * Validates whether a ticker is permitted by the allowlist.
 */
export function isAllowedYahooTicker(ticker: string): ticker is AllowedYahooTicker {
  return (ALLOWED_YAHOO_TICKERS as readonly string[]).includes(ticker.toUpperCase());
}

/**
 * Fetch daily historical close prices from Yahoo Finance chart API.
 * Enforces ticker allowlist, 12s timeout, null skipping, and error validation.
 */
export async function fetchNativeHistory(
  yahooTicker: string,
  yearsBack: number
): Promise<YahooHistoryResult> {
  const upper = yahooTicker.toUpperCase();
  if (!isAllowedYahooTicker(upper)) {
    throw new YahooError(
      'UNSUPPORTED_TICKER',
      `Ticker '${yahooTicker}' is rejected. Only allowlisted symbols [${ALLOWED_YAHOO_TICKERS.join(
        ', '
      )}] are permitted.`
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const period1 = Math.max(0, nowSec - Math.floor(yearsBack * 365.25 * 86400));
  const period2 = nowSec;

  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(
    upper
  )}?period1=${period1}&period2=${period2}&interval=1d`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new YahooError('TIMEOUT', 'Yahoo Finance request timed out after 12000ms');
    }
    if (error instanceof YahooError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown network failure';
    throw new YahooError('NETWORK_ERROR', message);
  }

  if (!response.ok) {
    throw new YahooError(String(response.status), response.statusText || 'HTTP error');
  }

  let payload: RawYahooChartResponse;
  try {
    payload = (await response.json()) as RawYahooChartResponse;
  } catch {
    throw new YahooError('INVALID_JSON', 'Failed to parse Yahoo response as JSON');
  }

  if (payload.chart.error !== null) {
    const errObj = payload.chart.error;
    throw new YahooError(errObj.code || 'YAHOO_ERROR', errObj.description || 'Yahoo API error');
  }

  if (!payload.chart.result || payload.chart.result.length === 0 || !payload.chart.result[0]) {
    throw new YahooError('NO_RESULT', `No chart data returned for ticker ${upper}`);
  }

  const chartData = payload.chart.result[0];
  const timestamps = chartData.timestamp ?? [];
  const closes = chartData.indicators?.quote?.[0]?.close ?? [];

  const candles: YahooCandle[] = [];
  const len = Math.min(timestamps.length, closes.length);

  for (let i = 0; i < len; i++) {
    const tsSec = timestamps[i];
    const close = closes[i];
    if (tsSec !== undefined && close !== undefined && close !== null && !Number.isNaN(close)) {
      candles.push({
        tsMs: tsSec * 1000,
        close,
      });
    }
  }

  const firstDateIso =
    candles.length > 0 && candles[0] ? new Date(candles[0].tsMs).toISOString() : '';
  const lastDateIso =
    candles.length > 0 && candles[candles.length - 1]
      ? new Date(candles[candles.length - 1]!.tsMs).toISOString()
      : '';

  return {
    candles,
    firstDateIso,
    lastDateIso,
    count: candles.length,
  };
}

/**
 * BaseRate Bitget Public REST Client
 * Read-only data adapter for public Bitget endpoints without credentials.
 *
 * Rules:
 * - 8s timeout via AbortSignal.timeout(8000)
 * - Bitget envelope { code, msg, data }: code !== '00000' throws BitgetError(code, msg)
 * - Typed return contracts with numeric values normalized to floats/integers
 * - No raw vendor payloads leak outside the data layer
 * - Zero external dependencies (uses global fetch)
 */

export const BITGET_BASE = 'https://api.bitget.com';

export class BitgetError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`Bitget API error [${code}]: ${message}`);
    this.name = 'BitgetError';
    this.code = code;
    Object.setPrototypeOf(this, BitgetError.prototype);
  }
}

export interface BitgetSpotTicker {
  symbol: string;
  lastPr: number;
  bidPr: number;
  askPr: number;
  ts: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface BitgetOrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  ts: number;
}

export interface Candle {
  tsMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export interface BitgetCurrentFunding {
  symbol: string;
  fundingRate: number;
  fundingRateInterval: number;
  nextUpdate: number;
}

export interface BitgetFundingHistoryRow {
  fundingRate: number;
  fundingTime: number;
}

interface BitgetResponseEnvelope<T> {
  code: string;
  msg: string;
  requestTime?: number;
  data: T;
}

/**
 * Internal helper to perform Bitget fetch with timeout and envelope verification.
 */
async function fetchBitgetEnvelope<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new BitgetError('TIMEOUT', 'Bitget request timed out after 8000ms');
    }
    if (error instanceof BitgetError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown network failure';
    throw new BitgetError('NETWORK_ERROR', message);
  }

  if (!response.ok) {
    throw new BitgetError(String(response.status), response.statusText || 'HTTP error');
  }

  let payload: BitgetResponseEnvelope<T>;
  try {
    payload = (await response.json()) as BitgetResponseEnvelope<T>;
  } catch {
    throw new BitgetError('INVALID_JSON', 'Failed to parse Bitget response as JSON');
  }

  if (payload.code !== '00000') {
    throw new BitgetError(payload.code, payload.msg || 'Unknown Bitget API error');
  }

  return payload.data;
}

/**
 * Fetch public spot ticker for an rToken symbol (e.g. 'RNVDAUSDT').
 * GET /api/v2/spot/market/tickers?symbol=RAPL form
 */
export async function fetchSpotTicker(rTokenSymbol: string): Promise<BitgetSpotTicker> {
  const url = `${BITGET_BASE}/api/v2/spot/market/tickers?symbol=${encodeURIComponent(rTokenSymbol)}`;
  interface RawSpotTickerItem {
    symbol: string;
    lastPr: string;
    bidPr: string;
    askPr: string;
    ts: string;
  }

  const data = await fetchBitgetEnvelope<RawSpotTickerItem[]>(url);
  if (!Array.isArray(data) || data.length === 0 || !data[0]) {
    throw new BitgetError('EMPTY_DATA', `No ticker data returned for symbol ${rTokenSymbol}`);
  }

  const raw = data[0];
  return {
    symbol: raw.symbol,
    lastPr: parseFloat(raw.lastPr),
    bidPr: parseFloat(raw.bidPr),
    askPr: parseFloat(raw.askPr),
    ts: parseInt(raw.ts, 10),
  };
}

/**
 * Fetch spot order book depth for an rToken.
 * GET /api/v2/spot/market/orderbook?symbol=X&type=step0&limit=N
 */
export async function fetchSpotOrderBook(
  rTokenSymbol: string,
  limit = 50
): Promise<BitgetOrderBook> {
  const url = `${BITGET_BASE}/api/v2/spot/market/orderbook?symbol=${encodeURIComponent(
    rTokenSymbol
  )}&type=step0&limit=${limit}`;

  interface RawOrderBook {
    asks: [string, string][];
    bids: [string, string][];
    ts: string;
  }

  const data = await fetchBitgetEnvelope<RawOrderBook>(url);
  if (!data || !Array.isArray(data.asks) || !Array.isArray(data.bids)) {
    throw new BitgetError('EMPTY_DATA', `Invalid orderbook data returned for symbol ${rTokenSymbol}`);
  }

  return {
    asks: data.asks.map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) })),
    bids: data.bids.map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) })),
    ts: parseInt(data.ts, 10),
  };
}

/**
 * Fetch spot candles for an rToken.
 * Spot candle granularity uses plain enum (e.g. '1day') - NOT UTC futures enum.
 * GET /api/v2/spot/market/candles?symbol=X&granularity=1day&limit=N
 */
export async function fetchSpotCandles(
  rTokenSymbol: string,
  limit = 100,
  endTime?: string | number
): Promise<Candle[]> {
  const clampedLimit = Math.min(Math.max(1, limit), 200);
  let url = `${BITGET_BASE}/api/v2/spot/market/candles?symbol=${encodeURIComponent(
    rTokenSymbol
  )}&granularity=1day&limit=${clampedLimit}`;

  if (endTime !== undefined && endTime !== null) {
    url += `&endTime=${encodeURIComponent(String(endTime))}`;
  }

  type RawCandleRow = [string, string, string, string, string, string, string, ...string[]];
  const data = await fetchBitgetEnvelope<RawCandleRow[]>(url);

  if (!Array.isArray(data)) {
    throw new BitgetError('EMPTY_DATA', `Invalid candles data for symbol ${rTokenSymbol}`);
  }

  return data.map((row) => ({
    tsMs: parseInt(row[0], 10),
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
    vol: parseFloat(row[5]),
  }));
}

/**
 * Fetch current funding rate for underlying stock perp (e.g. 'NVDAUSDT').
 * GET /api/v2/mix/market/current-fund-rate?symbol=X&productType=USDT-FUTURES
 */
export async function fetchCurrentFunding(perpSymbol: string): Promise<BitgetCurrentFunding> {
  const url = `${BITGET_BASE}/api/v2/mix/market/current-fund-rate?symbol=${encodeURIComponent(
    perpSymbol
  )}&productType=USDT-FUTURES`;

  interface RawCurrentFundingItem {
    symbol: string;
    fundingRate: string;
    fundingRateInterval: string;
    nextUpdate: string;
  }

  const data = await fetchBitgetEnvelope<RawCurrentFundingItem[]>(url);
  if (!Array.isArray(data) || data.length === 0 || !data[0]) {
    throw new BitgetError('EMPTY_DATA', `No current funding data for perp symbol ${perpSymbol}`);
  }

  const raw = data[0];
  return {
    symbol: raw.symbol,
    fundingRate: parseFloat(raw.fundingRate),
    fundingRateInterval: parseInt(raw.fundingRateInterval, 10),
    nextUpdate: parseInt(raw.nextUpdate, 10),
  };
}

/**
 * Fetch funding rate history for underlying stock perp.
 * GET /api/v2/mix/market/history-fund-rate?symbol=X&productType=USDT-FUTURES&limit=N
 * Note: field name is fundingTime (ms), NOT fundingRateTimestamp.
 */
export async function fetchFundingHistory(
  perpSymbol: string,
  limit = 100
): Promise<BitgetFundingHistoryRow[]> {
  const clampedLimit = Math.min(Math.max(1, limit), 100);
  const url = `${BITGET_BASE}/api/v2/mix/market/history-fund-rate?symbol=${encodeURIComponent(
    perpSymbol
    )}&productType=USDT-FUTURES&limit=${clampedLimit}`;

  interface RawFundingHistoryItem {
    symbol?: string;
    fundingRate: string;
    fundingTime: string;
  }

  const data = await fetchBitgetEnvelope<RawFundingHistoryItem[]>(url);
  if (!Array.isArray(data)) {
    throw new BitgetError('EMPTY_DATA', `Invalid funding history data for symbol ${perpSymbol}`);
  }

  return data.slice(0, clampedLimit).map((row) => ({
    fundingRate: parseFloat(row.fundingRate),
    fundingTime: parseInt(row.fundingTime, 10),
  }));
}

/**
 * Fetch perp candles using UTC futures enum '1Dutc' (mix family).
 * GET /api/v2/mix/market/candles?symbol=X&productType=USDT-FUTURES&granularity=1Dutc
 */
export async function fetchPerpCandles(perpSymbol: string, limit = 100): Promise<Candle[]> {
  const clampedLimit = Math.min(Math.max(1, limit), 200);
  const url = `${BITGET_BASE}/api/v2/mix/market/candles?symbol=${encodeURIComponent(
    perpSymbol
  )}&productType=USDT-FUTURES&granularity=1Dutc&limit=${clampedLimit}`;

  type RawCandleRow = [string, string, string, string, string, string, ...string[]];
  const data = await fetchBitgetEnvelope<RawCandleRow[]>(url);

  if (!Array.isArray(data)) {
    throw new BitgetError('EMPTY_DATA', `Invalid perp candles data for symbol ${perpSymbol}`);
  }

  return data.map((row) => ({
    tsMs: parseInt(row[0], 10),
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
    vol: parseFloat(row[5]),
  }));
}

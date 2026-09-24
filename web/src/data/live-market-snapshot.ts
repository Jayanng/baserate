/**
 * BaseRate Live Market Snapshot Module
 * Read-only orchestrator for fetching bounded Bitget live market data.
 *
 * Rules:
 * - Public Bitget REST endpoints only via bitget-client fetchers
 * - Strict TS, zero any, zero non-null assertions
 * - Never throws to caller: returns state 'unavailable' on any failure
 * - Never fabricates values
 * - Bounded by timeout (default 4000ms)
 */

import {
  fetchSpotTicker,
  fetchCurrentFunding,
  fetchSpotOrderBook,
  type BitgetOrderBook,
} from './bitget-client';
import {
  computeDepthStress,
  type DepthLevel,
  type DepthStressResult,
} from '../engine/depth-stress';

export type { DepthLevel, DepthStressResult };
export { computeDepthStress };

export type LiveSnapshotState = 'live' | 'unavailable';

export interface LiveMarketSnapshot {
  state: LiveSnapshotState;
  retrievedAtUtc: string | null;
  spotPrice: number | null;
  fundingRate: number | null;
  rTokenSymbol?: string | null;
  perpSymbol?: string | null;
  sourceLabel: {
    spotPrice: string;
    fundingRate: string;
  };
  reason: string | null;
}

export const REPLAY_ALLOWLIST_ASSETS = [
  'rNVDA',
  'rTSLA',
  'rAAPL',
  'rQQQ',
  'rMSTR',
] as const;

export const REPLAY_ALLOWLIST_RTOKENS = [
  'RNVDAUSDT',
  'RTSLAUSDT',
  'RAAPLUSDT',
  'RQQQUSDT',
  'RMSTRUSDT',
] as const;

export const REPLAY_ALLOWLIST_PERPS = [
  'NVDAUSDT',
  'TSLAUSDT',
  'AAPLUSDT',
  'QQQUSDT',
  'MSTRUSDT',
] as const;

export function isReplayAllowlistAsset(asset: string): boolean {
  const clean = asset.replace(/^[$#]/, '').trim();
  return REPLAY_ALLOWLIST_ASSETS.some(
    (allowed) => allowed.toLowerCase() === clean.toLowerCase()
  );
}

export function isReplayAllowlistedSymbol(symbol: string): boolean {
  const clean = symbol.replace(/^[$#]/, '').trim().toUpperCase();
  const allAllowed: readonly string[] = [
    ...REPLAY_ALLOWLIST_ASSETS.map((s) => s.toUpperCase()),
    ...REPLAY_ALLOWLIST_RTOKENS,
    ...REPLAY_ALLOWLIST_PERPS,
    'NVDA',
    'TSLA',
    'AAPL',
    'QQQ',
    'MSTR',
  ];
  return allAllowed.includes(clean);
}

export async function fetchLiveMarketSnapshot(
  rTokenSymbol: string,
  perpSymbol: string,
  timeoutMs: number = 4000
): Promise<LiveMarketSnapshot> {
  const normRToken =
    typeof rTokenSymbol === 'string' && rTokenSymbol.trim().length > 0
      ? rTokenSymbol.replace(/^[$#]/, '').trim().toUpperCase()
      : null;
  const normPerp =
    typeof perpSymbol === 'string' && perpSymbol.trim().length > 0
      ? perpSymbol.replace(/^[$#]/, '').trim().toUpperCase()
      : null;

  if (
    !normRToken ||
    !normPerp ||
    !isReplayAllowlistedSymbol(normRToken) ||
    !isReplayAllowlistedSymbol(normPerp)
  ) {
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      spotPrice: null,
      fundingRate: null,
      rTokenSymbol: normRToken,
      perpSymbol: normPerp,
      sourceLabel: {
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      },
      reason: 'asset not in replay allowlist',
    };
  }

  const controller = new AbortController();
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Bitget request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
      reject(
        new DOMException(
          `Bitget request timed out after ${timeoutMs}ms`,
          'AbortError'
        )
      );
    }, timeoutMs);
  });

  try {
    const [ticker, funding] = await Promise.race([
      Promise.all([
        fetchSpotTicker(normRToken),
        fetchCurrentFunding(normPerp),
      ]),
      timeoutPromise,
    ]);

    if (timerId !== undefined) {
      clearTimeout(timerId);
    }

    if (!Number.isFinite(ticker.lastPr) || ticker.lastPr <= 0) {
      return {
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        rTokenSymbol: normRToken,
        perpSymbol: normPerp,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: `Non-finite or invalid spot price: ${ticker.lastPr}`,
      };
    }

    if (!Number.isFinite(funding.fundingRate)) {
      return {
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        rTokenSymbol: normRToken,
        perpSymbol: normPerp,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: `Non-finite funding rate: ${funding.fundingRate}`,
      };
    }

    return {
      state: 'live',
      retrievedAtUtc: new Date().toISOString(),
      spotPrice: ticker.lastPr,
      fundingRate: funding.fundingRate,
      rTokenSymbol: normRToken,
      perpSymbol: normPerp,
      sourceLabel: {
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      },
      reason: null,
    };
  } catch (err: unknown) {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    const reason =
      err instanceof Error ? err.message : 'Unknown live market fetch error';
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      spotPrice: null,
      fundingRate: null,
      rTokenSymbol: normRToken,
      perpSymbol: normPerp,
      sourceLabel: {
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      },
      reason,
    };
  }
}

interface CachedDepthBook {
  book: BitgetOrderBook;
  timestamp: number;
}

const depthBookCache = new Map<string, CachedDepthBook>();

/**
 * Resets the in-memory order-book cache.
 */
export function clearDepthCache(): void {
  depthBookCache.clear();
}

export interface FetchLiveDepthStressParams {
  rTokenSymbol: string;
  side: 'buy' | 'sell';
  requestedNotionalUsdt: number;
  referencePrice: number;
  timeoutMs?: number;
}

/**
 * Fetches live Bitget spot order-book depth and computes depth stress.
 *
 * Rules:
 * - Allowlist guard: skips unsupported assets, returns state 'unavailable'
 * - 4s bounded timeout pattern with AbortController
 * - Never throws: catches all network, parsing, and timeout errors
 * - Normalizes and validates DepthLevel arrays with numeric validation
 * - Returns pure DepthStressResult
 */
export async function fetchLiveDepthStress(
  paramsOrSymbol: FetchLiveDepthStressParams | string,
  maybeSide?: 'buy' | 'sell',
  maybeRequestedNotionalUsdt?: number,
  maybeReferencePrice?: number,
  maybeTimeoutMs?: number
): Promise<DepthStressResult> {
  let rTokenSymbol: string;
  let side: 'buy' | 'sell';
  let requestedNotionalUsdt: number;
  let referencePrice: number;
  let timeoutMs: number;

  if (typeof paramsOrSymbol === 'object' && paramsOrSymbol !== null) {
    rTokenSymbol = paramsOrSymbol.rTokenSymbol;
    side = paramsOrSymbol.side;
    requestedNotionalUsdt = paramsOrSymbol.requestedNotionalUsdt;
    referencePrice = paramsOrSymbol.referencePrice;
    timeoutMs = paramsOrSymbol.timeoutMs ?? 4000;
  } else {
    rTokenSymbol = paramsOrSymbol;
    side = maybeSide ?? 'buy';
    requestedNotionalUsdt = maybeRequestedNotionalUsdt ?? 0;
    referencePrice = maybeReferencePrice ?? 0;
    timeoutMs = maybeTimeoutMs ?? 4000;
  }

  // 1. Allowlist guard
  if (!isReplayAllowlistedSymbol(rTokenSymbol)) {
    return {
      state: 'unavailable',
      observedAtUtc: null,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'asset not in replay allowlist',
    };
  }

  // 2. Validate basic inputs before making network calls
  if (side !== 'buy' && side !== 'sell') {
    return {
      state: 'unavailable',
      observedAtUtc: null,
      side: 'buy',
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Invalid side: must be buy or sell',
    };
  }

  if (
    typeof requestedNotionalUsdt !== 'number' ||
    !Number.isFinite(requestedNotionalUsdt) ||
    requestedNotionalUsdt <= 0
  ) {
    return {
      state: 'unavailable',
      observedAtUtc: null,
      side,
      requestedNotionalUsdt:
        typeof requestedNotionalUsdt === 'number' && Number.isFinite(requestedNotionalUsdt)
          ? requestedNotionalUsdt
          : 0,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Requested notional must be a positive finite number',
    };
  }

  if (
    typeof referencePrice !== 'number' ||
    !Number.isFinite(referencePrice) ||
    referencePrice <= 0
  ) {
    return {
      state: 'unavailable',
      observedAtUtc: null,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Reference price must be a positive finite number',
    };
  }

  // 3. Check in-memory cache (TTL 3000ms)
  const cached = depthBookCache.get(rTokenSymbol.toUpperCase());
  let rawBook: BitgetOrderBook;

  if (cached && Date.now() - cached.timestamp < 3000) {
    rawBook = cached.book;
  } else {
    const controller = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        controller.abort(
          new DOMException(
            `Bitget request timed out after ${timeoutMs}ms`,
            'AbortError'
          )
        );
        reject(
          new DOMException(
            `Bitget request timed out after ${timeoutMs}ms`,
            'AbortError'
          )
        );
      }, timeoutMs);
    });

    try {
      rawBook = await Promise.race([
        fetchSpotOrderBook(rTokenSymbol, 50),
        timeoutPromise,
      ]);
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      depthBookCache.set(rTokenSymbol.toUpperCase(), {
        book: rawBook,
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      const reason =
        err instanceof Error ? err.message : 'Unknown depth stress fetch error';
      return {
        state: 'unavailable',
        observedAtUtc: null,
        side,
        requestedNotionalUsdt,
        coveredNotionalUsdt: null,
        levelsConsumed: null,
        estimatedVwapPct: null,
        slippagePct: null,
        reason,
      };
    }
  }

  // 4. Validate order book data structure
  if (!rawBook || !Array.isArray(rawBook.asks) || !Array.isArray(rawBook.bids)) {
    return {
      state: 'unavailable',
      observedAtUtc: null,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: 'Invalid orderbook data returned',
    };
  }

  const observedAtUtc =
    rawBook.ts && Number.isFinite(rawBook.ts)
      ? new Date(rawBook.ts).toISOString()
      : new Date().toISOString();

  const rawLevels = side === 'buy' ? rawBook.asks : rawBook.bids;
  if (rawLevels.length === 0) {
    return {
      state: 'unavailable',
      observedAtUtc,
      side,
      requestedNotionalUsdt,
      coveredNotionalUsdt: null,
      levelsConsumed: null,
      estimatedVwapPct: null,
      slippagePct: null,
      reason: `Order book ${side === 'buy' ? 'asks' : 'bids'} are empty`,
    };
  }

  // Normalize and validate numeric levels
  const normalizedLevels: DepthLevel[] = [];
  for (const lvl of rawLevels) {
    if (
      !lvl ||
      typeof lvl.price !== 'number' ||
      typeof lvl.size !== 'number' ||
      !Number.isFinite(lvl.price) ||
      !Number.isFinite(lvl.size) ||
      lvl.price <= 0 ||
      lvl.size <= 0
    ) {
      return {
        state: 'unavailable',
        observedAtUtc,
        side,
        requestedNotionalUsdt,
        coveredNotionalUsdt: null,
        levelsConsumed: null,
        estimatedVwapPct: null,
        slippagePct: null,
        reason: 'Invalid or non-positive level price/size in order book',
      };
    }
    normalizedLevels.push({ price: lvl.price, size: lvl.size });
  }

  return computeDepthStress({
    levels: normalizedLevels,
    side,
    requestedNotionalUsdt,
    referencePrice,
    observedAtUtc,
  });
}


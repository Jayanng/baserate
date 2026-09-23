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

import { fetchSpotTicker, fetchCurrentFunding } from './bitget-client';

export type LiveSnapshotState = 'live' | 'unavailable';

export interface LiveMarketSnapshot {
  state: LiveSnapshotState;
  retrievedAtUtc: string | null;
  spotPrice: number | null;
  fundingRate: number | null;
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
  if (
    !isReplayAllowlistedSymbol(rTokenSymbol) ||
    !isReplayAllowlistedSymbol(perpSymbol)
  ) {
    return {
      state: 'unavailable',
      retrievedAtUtc: null,
      spotPrice: null,
      fundingRate: null,
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
        fetchSpotTicker(rTokenSymbol),
        fetchCurrentFunding(perpSymbol),
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
      sourceLabel: {
        spotPrice: 'bitget_spot',
        fundingRate: 'bitget_mix',
      },
      reason,
    };
  }
}

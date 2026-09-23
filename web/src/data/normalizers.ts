/**
 * BaseRate Data Normalizers
 * Pure transformation functions converting vendor adapter responses into strictly typed domain contracts.
 *
 * Rules:
 * - Pure functions with zero side effects
 * - Zero any and zero non-null assertions
 * - Preserves evidence status, sources, and provenance notes
 * - Unsafe vendor raw payloads never leave the data layer
 */

import {
  type MarketSnapshot,
  type FundingObservation,
  type WeekendGapObservation,
  type EvidenceItem,
  type EvidenceLabel,
  type EvidenceNumber,
  type RefusalState,
  type Result,
  ok,
  err,
} from '../domain/types';
import { ASSET_MAP } from '../domain/trade-parser';
import { makeEvidence, utcNowIso } from '../domain/provenance';
import type {
  BitgetSpotTicker,
  BitgetOrderBook,
  BitgetCurrentFunding,
  BitgetFundingHistoryRow,
} from './bitget-client';
import type { YahooCandle } from './yahoo-client';

/**
 * Normalizes Bitget spot ticker and optional order book into a domain MarketSnapshot.
 * Assigns observed evidence label with source 'bitget_spot'.
 */
export function toMarketSnapshot(
  ticker: BitgetSpotTicker,
  orderBook?: BitgetOrderBook | null
): MarketSnapshot {
  const cleanKey = ticker.symbol.toLowerCase().replace(/usdt$/, '');
  const assetMapping = ASSET_MAP[cleanKey];

  const canonicalAsset = assetMapping?.canonicalAsset ?? ticker.symbol;
  const rTokenSymbol = assetMapping?.rTokenSymbol ?? ticker.symbol;
  const perpSymbol = assetMapping?.perpSymbol ?? ticker.symbol.replace(/^R/, '');

  const timestampIso = new Date(ticker.ts).toISOString();

  const spotPriceEvidence: EvidenceItem = makeEvidence(
    'observed',
    'bitget_spot',
    timestampIso,
    `Bitget spot tape last price: ${ticker.lastPr}`
  );

  let depthTopUsdt: number | null = null;
  if (orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0) {
    const topBid = orderBook.bids[0];
    const topAsk = orderBook.asks[0];
    if (topBid && topAsk) {
      depthTopUsdt = Number((topBid.price * topBid.size + topAsk.price * topAsk.size).toFixed(2));
    }
  }

  const defaultFunding: FundingObservation = {
    ratePerInterval: null,
    intervalHours: 8,
    proxyUsed: false,
    source: 'unavailable',
  };

  return {
    asset: canonicalAsset,
    rTokenSymbol,
    perpSymbol,
    spotPrice: {
      value: ticker.lastPr,
      evidence: spotPriceEvidence,
    },
    perpPrice: null,
    funding: defaultFunding,
    frozenCollateral: {
      frozenIndex: null,
      freezeTimeUtc: null,
      ruleBasis: 'Pending Friday close freeze observation',
    },
    timestampUtc: timestampIso,
    health: {
      bitget: 'ok',
      yahoo: 'ok',
    },
    depthTopUsdt,
  };
}

/**
 * Converts Bitget perp funding into a FundingObservation with proxy disclosure.
 * Explicitly marks proxyUsed: true and attaches the required proxy note.
 */
export function toFundingObservation(
  current: BitgetCurrentFunding | null,
  _historyRows?: BitgetFundingHistoryRow[] | null,
  _holdingHours?: number,
  label: EvidenceLabel = 'estimated'
): FundingObservation {
  const proxyNote = 'stock-perp funding proxy for rToken';

  if (!current) {
    return {
      ratePerInterval: null,
      intervalHours: 8,
      proxyUsed: true,
      source: 'unavailable',
      note: proxyNote,
      label,
      evidence: makeEvidence(label, 'unavailable', null, proxyNote),
    };
  }

  const timestampIso = current.nextUpdate ? new Date(current.nextUpdate).toISOString() : null;

  return {
    ratePerInterval: current.fundingRate,
    intervalHours: 8,
    proxyUsed: true,
    source: 'bitget_mix',
    note: proxyNote,
    label,
    evidence: makeEvidence(label, 'bitget_mix', timestampIso, proxyNote),
  };
}

/**
 * Calculates estimated funding carry percentage across a specified holding window.
 * Formula: sum intervals mathematically (avgRate per 8h interval * (holdingHours / 8)) * 100
 * Refuses with INSUFFICIENT_EVIDENCE when fewer than 3 historical rows are available.
 */
export function estimateFundingCarryPct(
  rows: BitgetFundingHistoryRow[],
  holdingHours: number
): Result<EvidenceNumber, RefusalState> {
  if (!rows || rows.length < 3) {
    const count = rows ? rows.length : 0;
    return err({
      code: 'INSUFFICIENT_EVIDENCE',
      reason: `Insufficient funding history: ${count} intervals observed (minimum 3 required for carry estimate)`,
    });
  }

  const sumRate = rows.reduce((acc, row) => acc + row.fundingRate, 0);
  const avgRatePerInterval = sumRate / rows.length;
  const numIntervals = holdingHours / 8;
  const carryFraction = avgRatePerInterval * numIntervals;
  const carryPct = Number((carryFraction * 100).toFixed(6));

  const evidence = makeEvidence(
    'estimated',
    'bitget_mix',
    utcNowIso(),
    `Carry estimate over ${holdingHours}h (${numIntervals}x 8h intervals) from ${rows.length} observed rates`
  );

  return ok({
    value: carryPct,
    evidence,
  });
}

/**
 * Computes calendar date string (YYYY-MM-DD) for next Monday given a Friday date string.
 */
function getNextMondayDateStr(fridayDateStr: string): string {
  const parts = fridayDateStr.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;

  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

/**
 * Extracts Friday-close to Monday-open weekend gap observations from native daily candles.
 *
 * Rules:
 * - Only complete Friday -> Monday pairs (3 days apart) are evaluated; incomplete weeks are skipped
 * - Percent change computed as: ((close(Mon) - close(Fri)) / close(Fri)) * 100
 * - Returns WeekendGapObservation[] sorted descending by magnitude (|pct|)
 * - Source is tagged as 'yahoo_native'
 */
export function toWeekendGaps(nativeCandles: YahooCandle[]): WeekendGapObservation[] {
  if (!nativeCandles || nativeCandles.length === 0) {
    return [];
  }

  // Index candles by calendar date (YYYY-MM-DD)
  const dateMap = new Map<string, YahooCandle>();
  for (const candle of nativeCandles) {
    const dStr = new Date(candle.tsMs).toISOString().slice(0, 10);
    dateMap.set(dStr, candle);
  }

  const observations: WeekendGapObservation[] = [];

  for (const candle of nativeCandles) {
    const d = new Date(candle.tsMs);
    // getUTCDay: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    if (d.getUTCDay() === 5) {
      const friStr = d.toISOString().slice(0, 10);
      const expectedMonStr = getNextMondayDateStr(friStr);

      const monCandle = dateMap.get(expectedMonStr);
      if (monCandle) {
        const monDate = new Date(monCandle.tsMs);
        if (monDate.getUTCDay() === 1 && candle.close > 0) {
          const pct = ((monCandle.close - candle.close) / candle.close) * 100;
          observations.push({
            pct: Number(pct.toFixed(4)),
            episodeDate: friStr,
            source: 'yahoo_native',
          });
        }
      }
    }
  }

  // Sort descending by magnitude (|pct|)
  observations.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  return observations;
}

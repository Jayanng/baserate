import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

/**
 * Returns the categorization of an evidence source link:
 * - 'live': opens a public vendor endpoint returning JSON
 * - null: no linkable source
 *
 * Note (product decision, Johnson 2026-09-23): GitHub code links are DISABLED.
 * Computed/engine/fixture rows render as plain text - judges verify computed
 * numbers via the HOW disclosures on each tile instead of reading source code.
 */
export function sourceLinkKind(source: string): 'live' | null {
  if (!source) {
    return null;
  }
  const s = source.toLowerCase().trim();
  if (s === 'bitget_spot' || s === 'bitget_mix' || s === 'yahoo_native') {
    return 'live';
  }
  return null;
}

function extractTicker(trade: ParsedTrade | null): string {
  if (trade?.perpSymbol) {
    const stripped = trade.perpSymbol.replace(/USDT$/i, '').trim();
    if (stripped) return stripped.toUpperCase();
  }
  if (trade?.asset) {
    const stripped = trade.asset.replace(/^r/i, '').replace(/USDT$/i, '').trim();
    if (stripped) return stripped.toUpperCase();
  }
  return 'NVDA';
}

function extractUnixSeconds(item: EvidenceItem): number | null {
  if (item.timestampUtc) {
    const t = new Date(item.timestampUtc).getTime();
    if (!Number.isNaN(t)) {
      return Math.floor(t / 1000);
    }
  }
  if (item.note) {
    const isoMatch = item.note.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch && isoMatch[1]) {
      const t = new Date(`${isoMatch[1]}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(t)) {
        return Math.floor(t / 1000);
      }
    }
  }
  return null;
}

/**
 * Builds a direct public URL for an evidence item.
 * Only LIVE vendor endpoints are linked (public REST JSON feeds).
 * Computed/engine/fixture rows return null (plain text, verified via HOW disclosures).
 */
export function buildSourceHref(
  item: EvidenceItem,
  trade: ParsedTrade | null
): string | null {
  const source = item.source?.trim() ?? '';
  if (!source) {
    return null;
  }

  // 1. Bitget Spot Ticker (live public endpoint)
  if (source === 'bitget_spot') {
    const symbol = trade?.rTokenSymbol?.trim();
    if (!symbol) {
      return null;
    }
    return `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${encodeURIComponent(symbol)}`;
  }

  // 2. Bitget Mix Current Funding Rate (live public endpoint)
  if (source === 'bitget_mix') {
    const perpSymbol = trade?.perpSymbol?.trim();
    if (!perpSymbol) {
      return null;
    }
    return `https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=${encodeURIComponent(perpSymbol)}&productType=USDT-FUTURES`;
  }

  // 3. Yahoo Finance Native Chart (live public endpoint)
  if (source === 'yahoo_native') {
    const ticker = extractTicker(trade);
    const baseUnixSec = extractUnixSeconds(item);
    if (baseUnixSec === null) {
      return null;
    }
    const period1 = baseUnixSec - 7 * 86400;
    const period2 = baseUnixSec + 1 * 86400;
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;
  }

  // Computed/engine/fixture sources: intentionally not linked (product decision).
  return null;
}

import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

/**
 * Returns the categorization of an evidence source link:
 * - 'live': opens a public vendor endpoint returning JSON
 * - 'code': opens computation or fixture source code on GitHub
 * - null: no linkable source
 */
export function sourceLinkKind(source: string): 'live' | 'code' | null {
  if (!source) {
    return null;
  }
  const s = source.toLowerCase().trim();
  if (s === 'bitget_spot' || s === 'bitget_mix' || s === 'yahoo_native') {
    return 'live';
  }
  if (
    s === 'engine_risk' ||
    s === 'engine_base_rate' ||
    s === 'engine_regime' ||
    s === 'dossier-builder' ||
    s === 'dossier_builder' ||
    s === 'computed' ||
    s === 'replay_fixtures' ||
    s.startsWith('engine_') ||
    s.startsWith('replay_') ||
    s.includes('fixture')
  ) {
    return 'code';
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
 * Live endpoints link to official REST JSON feeds.
 * Computed numbers link to the exact calculation logic on GitHub.
 * Returns null when no meaningful link exists.
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

  // 4. Replay Fixtures (GitHub source)
  if (
    source === 'replay_fixtures' ||
    source.startsWith('replay_') ||
    (item.note && /fixtures?/i.test(item.note) && !source.startsWith('engine_'))
  ) {
    const ticker = extractTicker(trade);
    return `https://github.com/Jayanng/baserate/blob/main/web/fixtures/replay-${encodeURIComponent(ticker)}.json`;
  }

  // 5. Engine Base Rate (GitHub source)
  if (source === 'engine_base_rate' || source.includes('base_rate') || source.includes('base-rate')) {
    return 'https://github.com/Jayanng/baserate/blob/main/web/src/engine/base-rate.ts';
  }

  // 6. Dossier Builder (GitHub source)
  if (
    source === 'dossier-builder' ||
    source === 'dossier_builder' ||
    source.includes('dossier-builder') ||
    source.includes('dossier_builder')
  ) {
    return 'https://github.com/Jayanng/baserate/blob/main/web/src/engine/dossier-builder.ts';
  }

  // 7. Regime Classifier (GitHub source)
  if (source === 'engine_regime' || source.includes('regime')) {
    return 'https://github.com/Jayanng/baserate/blob/main/web/src/engine/regime-classifier.ts';
  }

  // 8. Risk Engine & other computed (GitHub source)
  if (source === 'engine_risk' || source.startsWith('engine_') || source === 'computed') {
    return 'https://github.com/Jayanng/baserate/blob/main/web/src/engine/risk-engine.ts';
  }

  return null;
}

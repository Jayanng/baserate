import type { ParsedTrade } from '@/src/domain/types';

/**
 * Pure helper comparing trade intent fields to determine if a re-submitted trade is identical.
 * Compares: asset, direction, leverage, sizeUsdt, and holdingWindow.
 */
export function isSameTrade(a: ParsedTrade, b: ParsedTrade): boolean {
  return (
    a.asset === b.asset &&
    a.direction === b.direction &&
    a.leverage === b.leverage &&
    a.sizeUsdt === b.sizeUsdt &&
    a.holdingWindow === b.holdingWindow
  );
}

/**
 * Normalizes an asset symbol for identity comparison.
 * Maps 'NVDA' and 'rNVDA' to canonical 'RNVDA', etc.
 */
export function normalizeAssetSymbol(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = raw.replace(/^[$#]/, '').trim().toUpperCase();
  if (clean === 'RNVDA' || clean === 'NVDA') return 'RNVDA';
  if (clean === 'RTSLA' || clean === 'TSLA') return 'RTSLA';
  if (clean === 'RAAPL' || clean === 'AAPL') return 'RAAPL';
  if (clean === 'RQQQ' || clean === 'QQQ') return 'RQQQ';
  if (clean === 'RMSTR' || clean === 'MSTR') return 'RMSTR';
  return clean;
}

/**
 * Pure helper deciding whether to clear live market context.
 * Only returns true when the incoming asset differs from the current asset.
 * Same-asset submissions (size/leverage only changes) return false.
 */
export function shouldResetLiveContext(
  currentAsset: string | null | undefined,
  nextAsset: string | null | undefined
): boolean {
  if (!currentAsset || !nextAsset) return true;
  return normalizeAssetSymbol(currentAsset) !== normalizeAssetSymbol(nextAsset);
}


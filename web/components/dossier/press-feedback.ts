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

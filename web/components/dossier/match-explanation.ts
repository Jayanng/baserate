/**
 * BaseRate Historical Match Explanation Helper
 * Pure TypeScript helper providing transparent, plain-English explanations
 * of why historical episodes are comparable to the active trade.
 *
 * Rules:
 * - Pure TypeScript functions with zero side effects
 * - NO raw hex, NO any, NO non-null assertions
 * - NO live network calls
 * - Distinguishes total available episodes from active matching policy
 * - Never falsely claims a subset when the engine uses the full distribution
 * - Derives labels dynamically per asset (never hardcodes NVDA for other assets)
 */

import type {
  ParsedTrade,
  RegimeTag,
  TradeDirection,
  EntryTiming,
  HoldingWindow,
} from '@/src/domain/types';
import { getReplayData, type ReplayAsset } from '@/src/data/replay-fixtures';
import { asReplayAsset } from './fixtures';

export interface MatchExplanationOptions {
  source?: string;
  dateRange?: string;
  totalAvailableEpisodes?: number;
  matchingPolicy?: string;
  historySourceDateRange?: string;
}

export interface MatchExplanationParams {
  parsed: ParsedTrade;
  regime: RegimeTag | string;
  sampleSize: number;
  source?: string;
  dateRange?: string;
  totalAvailableEpisodes?: number;
  matchingPolicy?: string;
  historySourceDateRange?: string;
}

export interface MatchExplanation {
  asset: string;
  direction: string;
  leverage: number;
  holdingWindow: string;
  entryTiming: string;
  regime: RegimeTag | string;
  sampleSize: number;
  totalAvailableEpisodes: number;
  historySource: string;
  dateRange: string;
  historySourceDateRange: string;
  history: string;
  matchingPolicy: string;
  summary: string;
  plainEnglishSummary: string;
  isFilteredSubset: boolean;
  matchedOnLabel: string;
  sampleLabel: string;

  // Bracket notation aliases for compatibility
  'holding window': string;
  'entry timing': string;
  'sample size': number;
  'history source/date range': string;
  'plain-English summary': string;
  'plain English summary': string;
}

/**
 * Derives start-to-end year range from gap episode dates (e.g. "1999–2026" or "2010–2026").
 */
export function deriveDateRangeFromGaps(
  gaps: Array<{ episodeDate?: string }>
): string {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    return '1999–2026';
  }
  const dates = gaps
    .map((g) => g.episodeDate)
    .filter((d): d is string => typeof d === 'string' && d.length >= 4)
    .sort();

  if (dates.length === 0) {
    return '1999–2026';
  }

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const startYear = firstDate ? firstDate.slice(0, 4) : '1999';
  const endYear = lastDate ? lastDate.slice(0, 4) : '2026';

  return startYear === endYear ? startYear : `${startYear}–${endYear}`;
}

/**
 * Derives default historical replay information for an asset.
 */
function getAssetHistoryInfo(asset: string): {
  source: string;
  dateRange: string;
  totalEpisodes: number;
  cleanTicker: string;
} {
  const cleanTicker = (asset || 'NVDA')
    .replace(/^[$#]/, '')
    .replace(/^r/i, '')
    .toUpperCase();
  const replayAsset: ReplayAsset = asReplayAsset(asset);

  try {
    const replayData = getReplayData(replayAsset);
    if (replayData) {
      const source = replayData.source || `yahoo_native ${cleanTicker} daily`;
      const totalEpisodes =
        replayData.totalEpisodes ||
        (Array.isArray(replayData.gaps) ? replayData.gaps.length : 0);
      const dateRange =
        Array.isArray(replayData.gaps) && replayData.gaps.length > 0
          ? deriveDateRangeFromGaps(replayData.gaps)
          : cleanTicker === 'TSLA'
            ? '2010–2026'
            : '1999–2026';

      return {
        source,
        dateRange,
        totalEpisodes,
        cleanTicker,
      };
    }
  } catch {
    // Replay accessor fallback
  }

  return {
    source: `yahoo_native ${cleanTicker} daily`,
    dateRange: cleanTicker === 'TSLA' ? '2010–2026' : '1999–2026',
    totalEpisodes: cleanTicker === 'TSLA' ? 736 : 1227,
    cleanTicker,
  };
}

function formatEntryTiming(timing: EntryTiming | string): string {
  if (timing === 'friday_close') return 'Friday-close entry';
  if (timing === 'monday_open') return 'Monday-open entry';
  return timing || 'Friday-close entry';
}

function formatHoldingWindow(window: HoldingWindow | string): string {
  if (window === 'weekend') return 'weekend hold';
  return window || 'weekend hold';
}

/**
 * Builds a structured, plain-English explanation of why the historical dataset
 * is comparable to the current trade.
 *
 * Distinguishes total available episodes from the active matching policy.
 * When the full distribution is used, truthfully states "regime-tagged full distribution"
 * instead of falsely claiming a filtered subset.
 */
export function buildMatchExplanation(
  parsed: ParsedTrade,
  regime: RegimeTag | string,
  sampleSize: number,
  historySourceOrOptions?: string | MatchExplanationOptions,
  dateRange?: string
): MatchExplanation;
export function buildMatchExplanation(
  params: MatchExplanationParams
): MatchExplanation;
export function buildMatchExplanation(
  parsedOrParams: ParsedTrade | MatchExplanationParams,
  maybeRegime?: RegimeTag | string,
  maybeSampleSize?: number,
  historySourceOrOptions?: string | MatchExplanationOptions,
  maybeDateRange?: string
): MatchExplanation {
  let parsed: ParsedTrade;
  let regime: RegimeTag | string;
  let sampleSize: number;
  let explicitSource: string | undefined;
  let explicitDateRange: string | undefined;
  let explicitTotal: number | undefined;
  let explicitPolicy: string | undefined;
  let explicitSourceDateRange: string | undefined;

  if ('parsed' in parsedOrParams) {
    parsed = parsedOrParams.parsed;
    regime = parsedOrParams.regime;
    sampleSize = parsedOrParams.sampleSize;
    explicitSource = parsedOrParams.source;
    explicitDateRange = parsedOrParams.dateRange;
    explicitTotal = parsedOrParams.totalAvailableEpisodes;
    explicitPolicy = parsedOrParams.matchingPolicy;
    explicitSourceDateRange = parsedOrParams.historySourceDateRange;
  } else {
    parsed = parsedOrParams;
    regime = maybeRegime ?? 'insufficient_evidence';
    sampleSize = typeof maybeSampleSize === 'number' ? maybeSampleSize : 0;

    if (
      typeof historySourceOrOptions === 'object' &&
      historySourceOrOptions !== null
    ) {
      explicitSource = historySourceOrOptions.source;
      explicitDateRange = historySourceOrOptions.dateRange;
      explicitTotal = historySourceOrOptions.totalAvailableEpisodes;
      explicitPolicy = historySourceOrOptions.matchingPolicy;
      explicitSourceDateRange = historySourceOrOptions.historySourceDateRange;
    } else if (typeof historySourceOrOptions === 'string') {
      explicitSource = historySourceOrOptions;
      explicitDateRange = maybeDateRange;
    }
  }

  const assetInfo = getAssetHistoryInfo(parsed.asset);
  const cleanTicker = assetInfo.cleanTicker;
  const assetSymbol = parsed.asset.startsWith('r')
    ? parsed.asset
    : `r${cleanTicker}`;

  const resolvedSource = explicitSource || assetInfo.source;
  const resolvedDateRange = explicitDateRange || assetInfo.dateRange;
  const resolvedTotalEpisodes =
    typeof explicitTotal === 'number' && explicitTotal > 0
      ? explicitTotal
      : assetInfo.totalEpisodes > 0
        ? assetInfo.totalEpisodes
        : sampleSize;

  const resolvedHistorySourceDateRange =
    explicitSourceDateRange ||
    `native ${cleanTicker} daily closes, ${resolvedDateRange}`;

  const directionStr: TradeDirection | string = parsed.direction || 'long';
  const leverageNum = parsed.leverage || 1;
  const entryTimingStr = formatEntryTiming(parsed.entryTiming);
  const holdingWindowStr = formatHoldingWindow(parsed.holdingWindow);
  const regimeStr = String(regime);
  const regimeDisplay = regimeStr.replace(/_/g, '-');

  const isFilteredSubset = sampleSize < resolvedTotalEpisodes;

  let matchingPolicy: string;
  if (explicitPolicy) {
    matchingPolicy = explicitPolicy;
  } else if (isFilteredSubset) {
    matchingPolicy = `Regime-filtered subset: ${sampleSize.toLocaleString()} of ${resolvedTotalEpisodes.toLocaleString()} historical episodes matched to the active ${regimeDisplay} regime.`;
  } else {
    matchingPolicy = `Regime-tagged full distribution: all ${sampleSize.toLocaleString()} observed Friday-to-Monday episodes are included in the baseline distribution, tagged with the active market regime (${regimeDisplay}).`;
  }

  const summaryPolicyPhrase = isFilteredSubset
    ? 'regime-filtered subset'
    : 'regime-tagged full distribution';

  const summary = `Matched on: ${assetSymbol} · ${directionStr} · ${leverageNum}x leverage · ${entryTimingStr} · ${holdingWindowStr} · ${regimeDisplay} regime. Sample: ${sampleSize.toLocaleString()} observed Friday-to-Monday episodes (${summaryPolicyPhrase}). History: ${resolvedHistorySourceDateRange}.`;

  const matchedOnLabel = `Matched on: ${assetSymbol} · ${entryTimingStr} · ${holdingWindowStr} · ${regimeDisplay} regime`;
  const sampleLabel = `${sampleSize.toLocaleString()} observed Friday-to-Monday episodes`;

  return {
    asset: assetSymbol,
    direction: directionStr,
    leverage: leverageNum,
    holdingWindow: holdingWindowStr,
    entryTiming: entryTimingStr,
    regime,
    sampleSize,
    totalAvailableEpisodes: resolvedTotalEpisodes,
    historySource: resolvedSource,
    dateRange: resolvedDateRange,
    historySourceDateRange: resolvedHistorySourceDateRange,
    history: resolvedHistorySourceDateRange,
    matchingPolicy,
    summary,
    plainEnglishSummary: summary,
    isFilteredSubset,
    matchedOnLabel,
    sampleLabel,

    // Aliases
    'holding window': holdingWindowStr,
    'entry timing': entryTimingStr,
    'sample size': sampleSize,
    'history source/date range': resolvedHistorySourceDateRange,
    'plain-English summary': summary,
    'plain English summary': summary,
  };
}

/**
 * BaseRate Trade Intent Parser
 * Deterministic regex-based parser converting plain-English trade ideas into ParsedTrade contracts.
 *
 * Rules:
 * - Fail-closed: Ambiguous or missing values produce PARSE_UNCERTAIN RefusalState.
 * - Never guess defaults for missing leverage or size.
 * - Pure functions with zero any and zero non-null assertions.
 */

import {
  type ParsedTrade,
  type RefusalState,
  type Result,
  type TradeDirection,
  type HoldingWindow,
  type EntryTiming,
  type CollateralType,
  err,
} from './types';
import { validateParsedTrade } from './validation';

export interface AssetMapping {
  readonly canonicalAsset: string;
  readonly rTokenSymbol: string;
  readonly perpSymbol: string;
}

/**
 * Constant mapping of Bitget rTokens to spot tickers and underlying stock perp funding proxies.
 */
export const ASSET_MAP: Record<string, AssetMapping> = {
  rnvda: {
    canonicalAsset: 'rNVDA',
    rTokenSymbol: 'RNVDAUSDT',
    perpSymbol: 'NVDAUSDT',
  },
  rtsla: {
    canonicalAsset: 'rTSLA',
    rTokenSymbol: 'RTSLAUSDT',
    perpSymbol: 'TSLAUSDT',
  },
  raapl: {
    canonicalAsset: 'rAAPL',
    rTokenSymbol: 'RAAPLUSDT',
    perpSymbol: 'AAPLUSDT',
  },
  rqqq: {
    canonicalAsset: 'rQQQ',
    rTokenSymbol: 'RQQQUSDT',
    perpSymbol: 'QQQUSDT',
  },
  rmstr: {
    canonicalAsset: 'rMSTR',
    rTokenSymbol: 'RMSTRUSDT',
    perpSymbol: 'MSTRUSDT',
  },
};

interface ExtractedAsset {
  readonly mapping?: AssetMapping;
  readonly unknownSymbol?: string;
}

function extractAsset(raw: string): ExtractedAsset | null {
  // Check for rToken forms such as rNVDA, RAAPL, rTSLA, RNVDAUSDT
  const rTokenRegex = /\b([rR][A-Za-z]+)\b/g;
  const matches = Array.from(raw.matchAll(rTokenRegex));

  for (const m of matches) {
    const symbol = m[1];
    if (typeof symbol !== 'string') {
      continue;
    }
    const cleanKey = symbol.toLowerCase().replace(/usdt$/, '');
    const found = ASSET_MAP[cleanKey];
    if (found) {
      return { mapping: found };
    }
    return { unknownSymbol: symbol };
  }

  // Check for bare underlying tickers without 'r' prefix (e.g. NVDA, TSLA)
  const bareTickers = ['NVDA', 'TSLA', 'AAPL', 'QQQ', 'MSTR'] as const;
  for (const ticker of bareTickers) {
    const bareRegex = new RegExp(`\\b${ticker}\\b`, 'i');
    if (bareRegex.test(raw)) {
      return { unknownSymbol: ticker };
    }
  }

  return null;
}

interface ExtractedLeverage {
  readonly leverage: number;
  readonly matchStr: string;
}

function extractLeverage(raw: string): ExtractedLeverage | null {
  // Pattern 1: Nx or Nx leverage, e.g., '3x', '3x leverage', 'at 3x', '3.5x'
  const pattern1 = /\b(?:at\s+)?(\d+(?:\.\d+)?)\s*x(?:\s+leverage)?\b/i;
  const match1 = raw.match(pattern1);
  if (match1 && typeof match1[1] === 'string') {
    const val = parseFloat(match1[1]);
    if (!Number.isNaN(val)) {
      return { leverage: val, matchStr: match1[0] };
    }
  }

  // Pattern 2: leverage N or leverage Nx, e.g., 'leverage 3', 'leverage 3x'
  const pattern2 = /\bleverage\s+(\d+(?:\.\d+)?)\s*x?\b/i;
  const match2 = raw.match(pattern2);
  if (match2 && typeof match2[1] === 'string') {
    const val = parseFloat(match2[1]);
    if (!Number.isNaN(val)) {
      return { leverage: val, matchStr: match2[0] };
    }
  }

  return null;
}

function extractSize(raw: string): number | null {
  // Fail-closed guard: a negated amount adjacent to a size unit ('-5000 USDT',
  // '-$5,000', '- 5,000 USDT margin') is ambiguous or invalid input. Refuse it
  // instead of silently reading the magnitude as a positive size. The unit must
  // be adjacent to the negated number (suffix or dollar prefix) so ordinary
  // ranges like '9-5' or year ranges elsewhere in the sentence do not trigger it.
  const negatedAmount = new RegExp(
    '-\\s*\\$?\\s*(?:[\\d]{1,3}(?:,\\d{3})+|[\\d]{3,})(?:\\.\\d+)?\\s*(?:usdt|margin)|-\\s*\\$\\s*(?:[\\d]{1,3}(?:,\\d{3})+|[\\d]{3,})',
    'i'
  );
  if (negatedAmount.test(raw)) {
    return null;
  }

  // Pattern 1: Explicitly tagged with USDT, margin, $, or size
  const pattern1 = /(?:\$|with\s+|size\s+|margin\s+)?\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:usdt\s+margin|usdt|margin|\$)\b/i;
  const match1 = raw.match(pattern1);
  if (match1 && typeof match1[1] === 'string') {
    const val = parseFloat(match1[1].replace(/,/g, ''));
    if (!Number.isNaN(val)) {
      return val;
    }
  }

  // Pattern 2: Comma-formatted number, e.g. 5,000 or 12,500
  const pattern2 = /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/;
  const match2 = raw.match(pattern2);
  if (match2 && typeof match2[1] === 'string') {
    const val = parseFloat(match2[1].replace(/,/g, ''));
    if (!Number.isNaN(val)) {
      return val;
    }
  }

  // Pattern 3: Number preceded by 'with', 'margin', 'size', or '$'
  const pattern3 = /(?:with|margin|size|\$)\s+(\d+(?:\.\d+)?)\b/i;
  const match3 = raw.match(pattern3);
  if (match3 && typeof match3[1] === 'string') {
    const val = parseFloat(match3[1].replace(/,/g, ''));
    if (!Number.isNaN(val)) {
      return val;
    }
  }

  // Pattern 4: Standalone number when only one number remains in the input
  const pattern4 = /\b(\d+(?:\.\d+)?)\b/g;
  const matches = Array.from(raw.matchAll(pattern4));
  if (matches.length === 1 && matches[0] && typeof matches[0][1] === 'string') {
    const val = parseFloat(matches[0][1]);
    if (!Number.isNaN(val)) {
      return val;
    }
  }

  return null;
}

/**
 * Parses a plain-English trade intent into a validated ParsedTrade contract.
 *
 * Example golden input:
 * 'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.'
 */
export function parseTradeIntent(raw: string): Result<ParsedTrade, RefusalState> {
  if (!raw || raw.trim().length === 0) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: 'Trade description is empty',
    });
  }

  const trimmed = raw.trim();
  const reasons: string[] = [];

  // Direction
  const hasLong = /\blong\b/i.test(trimmed);
  const hasShort = /\bshort\b/i.test(trimmed);
  let direction: TradeDirection | undefined;

  if (hasLong && hasShort) {
    reasons.push("Ambiguous direction (both 'long' and 'short' detected)");
  } else if (!hasLong && !hasShort) {
    reasons.push("Missing direction ('long' or 'short')");
  } else if (hasLong) {
    direction = 'long';
  } else {
    direction = 'short';
  }

  // Asset
  const assetResult = extractAsset(trimmed);
  let mapping: AssetMapping | undefined;

  if (!assetResult) {
    reasons.push('Missing asset (expected Bitget rToken such as rNVDA, rTSLA, rAAPL, rQQQ, rMSTR)');
  } else if (assetResult.unknownSymbol) {
    reasons.push(
      `Unknown or unsupported asset '${assetResult.unknownSymbol}' (supported: rNVDA, rTSLA, rAAPL, rQQQ, rMSTR)`
    );
  } else {
    mapping = assetResult.mapping;
  }

  // Leverage
  const leverageResult = extractLeverage(trimmed);
  if (!leverageResult) {
    reasons.push("Missing leverage (e.g. '3x')");
  }

  // Size: remove leverage match from string to prevent numerical conflict
  const rawWithoutLev = leverageResult
    ? trimmed.replace(leverageResult.matchStr, ' ')
    : trimmed;
  const sizeUsdt = extractSize(rawWithoutLev);
  if (sizeUsdt === null) {
    reasons.push("Missing margin size (e.g. '5,000 USDT')");
  }

  // Holding window
  const isWeekend = /\bweekend\b/i.test(trimmed);
  const isCustom = /\bcustom\b/i.test(trimmed);
  let holdingWindow: HoldingWindow | undefined;

  if (!isWeekend && !isCustom) {
    reasons.push("Missing holding window (expected 'weekend')");
  } else if (isWeekend) {
    holdingWindow = 'weekend';
  } else {
    holdingWindow = 'custom';
  }

  // Entry timing
  const isMondayOpen = /\bmonday\s+open\b/i.test(trimmed);
  const entryTiming: EntryTiming = isMondayOpen ? 'monday_open' : 'friday_close';

  // Collateral
  const isCryptoCollateral = /\bcrypto\b/i.test(trimmed);
  const collateral: CollateralType = isCryptoCollateral ? 'crypto' : 'usdt';

  // If any required field is missing or ambiguous, refuse with PARSE_UNCERTAIN
  if (reasons.length > 0 || !direction || !mapping || !leverageResult || sizeUsdt === null || !holdingWindow) {
    return err({
      code: 'PARSE_UNCERTAIN',
      reason: reasons.join('; '),
    });
  }

  const candidate: ParsedTrade = {
    asset: mapping.canonicalAsset,
    rTokenSymbol: mapping.rTokenSymbol,
    perpSymbol: mapping.perpSymbol,
    direction,
    sizeUsdt,
    leverage: leverageResult.leverage,
    entryTiming,
    holdingWindow,
    collateral,
    evidence: 'parsed',
  };

  // Run pure domain validation against constraints (size > 0, 1 <= leverage <= 25, etc.)
  return validateParsedTrade(candidate);
}

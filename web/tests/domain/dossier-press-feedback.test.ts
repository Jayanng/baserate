import { describe, it, expect } from 'vitest';
import {
  isSameTrade,
  shouldResetLiveContext,
  normalizeAssetSymbol,
} from '@/components/dossier/press-feedback';
import type { ParsedTrade } from '@/src/domain/types';

describe('dossier press feedback: isSameTrade', () => {
  const baseTrade: ParsedTrade = {
    asset: 'rNVDA',
    rTokenSymbol: 'RNVDAUSDT',
    perpSymbol: 'NVDAUSDT',
    direction: 'long',
    leverage: 3,
    sizeUsdt: 5000,
    entryTiming: 'friday_close',
    holdingWindow: 'weekend',
    collateral: 'usdt',
    evidence: 'parsed',
  };

  it('returns true when trade inputs are identical', () => {
    const identicalTrade: ParsedTrade = { ...baseTrade };
    expect(isSameTrade(baseTrade, identicalTrade)).toBe(true);
  });

  it('returns false when leverage is different', () => {
    const differentLeverage: ParsedTrade = {
      ...baseTrade,
      leverage: 5,
    };
    expect(isSameTrade(baseTrade, differentLeverage)).toBe(false);
  });

  it('returns false when asset is different', () => {
    const differentAsset: ParsedTrade = {
      ...baseTrade,
      asset: 'rTSLA',
      rTokenSymbol: 'RTSLAUSDT',
      perpSymbol: 'TSLAUSDT',
    };
    expect(isSameTrade(baseTrade, differentAsset)).toBe(false);
  });

  it('returns false when size is different', () => {
    const differentSize: ParsedTrade = {
      ...baseTrade,
      sizeUsdt: 10000,
    };
    expect(isSameTrade(baseTrade, differentSize)).toBe(false);
  });

  it('returns false when direction is different', () => {
    const differentDirection: ParsedTrade = {
      ...baseTrade,
      direction: 'short',
    };
    expect(isSameTrade(baseTrade, differentDirection)).toBe(false);
  });

  it('returns false when holdingWindow is different', () => {
    const differentHoldingWindow: ParsedTrade = {
      ...baseTrade,
      holdingWindow: 'custom',
    };
    expect(isSameTrade(baseTrade, differentHoldingWindow)).toBe(false);
  });
});

describe('shouldResetLiveContext: live market context reset guard', () => {
  it('returns false when current and next asset are identical (golden default dossier render)', () => {
    expect(shouldResetLiveContext('rNVDA', 'rNVDA')).toBe(false);
    expect(shouldResetLiveContext('rTSLA', 'rTSLA')).toBe(false);
  });

  it('returns false when assets differ only in casing, prefix, or r-token wrapper', () => {
    expect(shouldResetLiveContext('rNVDA', 'NVDA')).toBe(false);
    expect(shouldResetLiveContext('NVDA', 'rNVDA')).toBe(false);
    expect(shouldResetLiveContext('rtsla', 'RTSLA')).toBe(false);
    expect(shouldResetLiveContext('$rNVDA', 'rNVDA')).toBe(false);
    expect(normalizeAssetSymbol('rNVDA')).toBe('RNVDA');
    expect(normalizeAssetSymbol('NVDA')).toBe('RNVDA');
  });

  it('returns true when next asset is a different asset', () => {
    expect(shouldResetLiveContext('rNVDA', 'rTSLA')).toBe(true);
    expect(shouldResetLiveContext('rTSLA', 'rAAPL')).toBe(true);
    expect(shouldResetLiveContext('rQQQ', 'rMSTR')).toBe(true);
  });

  it('returns true when current or next asset is null or empty', () => {
    expect(shouldResetLiveContext(null, 'rNVDA')).toBe(true);
    expect(shouldResetLiveContext('rNVDA', null)).toBe(true);
    expect(shouldResetLiveContext('', 'rNVDA')).toBe(true);
    expect(shouldResetLiveContext('rNVDA', '')).toBe(true);
  });

  it('preserves live context on same-asset restress when only size or leverage changes', () => {
    // Default dossier is rNVDA; user restresses with same asset
    const currentAsset = 'rNVDA';
    const restressedTradeAsset = 'rNVDA';
    expect(shouldResetLiveContext(currentAsset, restressedTradeAsset)).toBe(false);
  });
});


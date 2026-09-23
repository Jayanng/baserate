import { describe, it, expect } from 'vitest';
import { isSameTrade } from '@/components/dossier/press-feedback';
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

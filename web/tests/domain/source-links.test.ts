import { describe, it, expect } from 'vitest';
import { buildSourceHref, sourceLinkKind } from '@/components/dossier/source-links';
import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

describe('source-links', () => {
  const mockTrade: ParsedTrade = {
    asset: 'rNVDA',
    rTokenSymbol: 'RNVDAUSDT',
    perpSymbol: 'NVDAUSDT',
    direction: 'long',
    sizeUsdt: 5000,
    leverage: 3,
    entryTiming: 'friday_close',
    holdingWindow: 'weekend',
    collateral: 'usdt',
    evidence: 'parsed',
  };

  it('bitget_spot with trade rTokenSymbol RNVDAUSDT -> href contains tickers?symbol=RNVDAUSDT and kind live', () => {
    const item: EvidenceItem = {
      label: 'observed',
      source: 'bitget_spot',
      timestampUtc: '2026-09-23T10:00:00.000Z',
    };
    const href = buildSourceHref(item, mockTrade);
    const kind = sourceLinkKind(item.source);
    expect(href).toContain('tickers?symbol=RNVDAUSDT');
    expect(kind).toBe('live');
  });

  it('bitget_mix with perpSymbol NVDAUSDT -> href contains current-fund-rate?symbol=NVDAUSDT and kind live', () => {
    const item: EvidenceItem = {
      label: 'observed',
      source: 'bitget_mix',
      timestampUtc: '2026-09-23T10:00:00.000Z',
    };
    const href = buildSourceHref(item, mockTrade);
    const kind = sourceLinkKind(item.source);
    expect(href).toContain('current-fund-rate?symbol=NVDAUSDT');
    expect(kind).toBe('live');
  });

  it('yahoo_native with perpSymbol NVDAUSDT -> href contains query1.finance.yahoo.com and NVDA and kind live', () => {
    const item: EvidenceItem = {
      label: 'observed',
      source: 'yahoo_native',
      timestampUtc: '2020-03-13T20:00:00.000Z',
    };
    const href = buildSourceHref(item, mockTrade);
    const kind = sourceLinkKind(item.source);
    expect(href).toContain('query1.finance.yahoo.com');
    expect(href).toContain('NVDA');
    expect(kind).toBe('live');
  });

  it('engine_risk -> href contains github.com/Jayanng/baserate/blob/main/web/src/engine/risk-engine.ts and kind code', () => {
    const item: EvidenceItem = {
      label: 'computed',
      source: 'engine_risk',
      timestampUtc: '2026-09-23T10:00:00.000Z',
    };
    const href = buildSourceHref(item, mockTrade);
    const kind = sourceLinkKind(item.source);
    expect(href).toContain('github.com/Jayanng/baserate/blob/main/web/src/engine/risk-engine.ts');
    expect(kind).toBe('code');
  });

  it('unknown source -> null href', () => {
    const item: EvidenceItem = {
      label: 'observed',
      source: 'unknown_source',
      timestampUtc: null,
    };
    const href = buildSourceHref(item, mockTrade);
    expect(href).toBeNull();
  });

  it('timestamp-based yahoo URL: item with timestampUtc 2020-03-13T20:00:00.000Z produces a period1 unix strictly less than period2', () => {
    const item: EvidenceItem = {
      label: 'observed',
      source: 'yahoo_native',
      timestampUtc: '2020-03-13T20:00:00.000Z',
    };
    const href = buildSourceHref(item, mockTrade);
    expect(href).not.toBeNull();
    const url = new URL(href as string);
    const period1 = Number(url.searchParams.get('period1'));
    const period2 = Number(url.searchParams.get('period2'));
    expect(Number.isFinite(period1)).toBe(true);
    expect(Number.isFinite(period2)).toBe(true);
    expect(period1).toBeLessThan(period2);
  });
});

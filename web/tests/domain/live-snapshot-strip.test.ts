import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LiveMarketSnapshotStrip, {
  formatSnapshotTime,
} from '@/components/dossier/LiveMarketSnapshotStrip';
import type { LiveMarketSnapshot } from '@/src/data/live-market-snapshot';
import { sourceLinkKind, buildSourceHref } from '@/components/dossier/source-links';
import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

describe('LiveMarketSnapshotStrip component & evidence flow', () => {
  const FORBIDDEN_WORDS_REGEX =
    /\b(buy|sell|hold|safe|unsafe|safer|safest|advice|recommend|recommendation)\b/i;

  describe('formatSnapshotTime', () => {
    it('formats ISO string to HH:MM:SS UTC', () => {
      const formatted = formatSnapshotTime('2026-09-23T14:32:05.123Z');
      expect(formatted).toBe('14:32:05 UTC');
    });

    it('returns em dash for null or invalid inputs', () => {
      expect(formatSnapshotTime(null)).toBe('—');
      expect(formatSnapshotTime('')).toBe('—');
      expect(formatSnapshotTime('not-a-date')).toBe('not-a-date');
    });
  });

  describe('rendering states', () => {
    it('renders nothing when snapshot is null (loading-neutral state, no layout shift)', () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveMarketSnapshotStrip, { snapshot: null })
      );
      expect(html).toBe('');
    });

    it('renders live strip with LIVE OBSERVED badge, dot, and retrieved details', () => {
      const liveSnapshot: LiveMarketSnapshot = {
        state: 'live',
        retrievedAtUtc: '2026-09-23T15:20:30.000Z',
        spotPrice: 228.2,
        fundingRate: 0.000219,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(LiveMarketSnapshotStrip, { snapshot: liveSnapshot })
      );

      // Prefix and provenance badge
      expect(html).toContain('Current market snapshot:');
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('liveStripDotLive');

      // Details: REST source, time, spot, and funding
      expect(html).toContain('Bitget public REST');
      expect(html).toContain('retrieved 15:20:30 UTC');
      expect(html).toContain('spot 228.2');
      expect(html).toContain('funding 0.000219');

      // Zero forbidden recommendation words
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders unavailable strip with UNAVAILABLE badge, reason, and pinned replay notice', () => {
      const unavailableSnapshot: LiveMarketSnapshot = {
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: 'Bitget request timed out after 4000ms',
      };

      const html = renderToStaticMarkup(
        React.createElement(LiveMarketSnapshotStrip, {
          snapshot: unavailableSnapshot,
        })
      );

      // Header and badge
      expect(html).toContain('CURRENT MARKET SNAPSHOT:');
      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain('liveStripDotUnavailable');

      // Reason and pinned replay notice
      expect(html).toContain('Bitget request timed out after 4000ms');
      expect(html).toContain('pinned replay values in use below.');

      // Zero forbidden recommendation words
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders asset not in replay allowlist reason cleanly', () => {
      const allowlistRefusalSnapshot: LiveMarketSnapshot = {
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: 'asset not in replay allowlist',
      };

      const html = renderToStaticMarkup(
        React.createElement(LiveMarketSnapshotStrip, {
          snapshot: allowlistRefusalSnapshot,
        })
      );

      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain('asset not in replay allowlist');
      expect(html).toContain('pinned replay values in use below.');
    });
  });

  describe('evidence table integration and source-links consistency', () => {
    const trade: ParsedTrade = {
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

    it('keeps sourceLinkKind untouched and returns null for bitget_live', () => {
      expect(sourceLinkKind('bitget_live')).toBeNull();
      expect(sourceLinkKind('bitget_spot')).toBe('live');
      expect(sourceLinkKind('bitget_mix')).toBe('live');
      expect(sourceLinkKind('yahoo_native')).toBe('live');
    });

    it('buildSourceHref returns null for bitget_live (renders plain text, no link)', () => {
      const liveItem: EvidenceItem = {
        label: 'observed',
        source: 'bitget_live',
        timestampUtc: '2026-09-23T15:20:30.000Z',
        note: 'Bitget public REST: spot 228.2, funding 0.000219',
      };
      expect(buildSourceHref(liveItem, trade)).toBeNull();

      const unavailItem: EvidenceItem = {
        label: 'estimated',
        source: 'bitget_live',
        timestampUtc: null,
        note: 'Bitget live market snapshot unavailable; pinned replay values in use below.',
      };
      expect(buildSourceHref(unavailItem, trade)).toBeNull();
    });
  });
});

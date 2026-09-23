import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WeekendDepthCheckCard from '@/components/dossier/WeekendDepthCheckCard';
import type { DepthStressResult } from '@/src/engine/depth-stress';
import { sourceLinkKind, buildSourceHref } from '@/components/dossier/source-links';
import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

describe('WeekendDepthCheckCard component & depth evidence flow', () => {
  const FORBIDDEN_WORDS_REGEX =
    /\b(buy\s+now|sell\s+now|hold\b|safe\b|unsafe\b|safer\b|safest\b|advice\b|recommend\b|recommendation\b)\b/i;

  describe('rendering states', () => {
    it('renders nothing when result is null (loading-neutral state, no layout shift)', () => {
      const html = renderToStaticMarkup(
        React.createElement(WeekendDepthCheckCard, { result: null })
      );
      expect(html).toBe('');
    });

    it('renders LIVE OBSERVED card with exact metrics, 2-decimal slippage, and HOW disclosure', () => {
      const liveResult: DepthStressResult = {
        state: 'ok',
        observedAtUtc: '2026-09-23T14:30:00.000Z',
        side: 'buy',
        requestedNotionalUsdt: 5000,
        coveredNotionalUsdt: 5000,
        levelsConsumed: 3,
        estimatedVwapPct: 0.4528,
        slippagePct: 0.4528,
        reason: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(WeekendDepthCheckCard, { result: liveResult })
      );

      // Title, subtitle, and badge
      expect(html).toContain('Weekend depth check');
      expect(html).toContain(
        'Public order book snapshot - estimate only - no order sent'
      );
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('depthDotLive');

      // Metric tiles
      expect(html).toContain('14:30:00 UTC');
      expect(html).toContain('5,000 USDT');
      expect(html).toContain('3');
      expect(html).toContain('0.45%');

      // HOW disclosure
      expect(html).toContain('HOW');
      expect(html).toContain('accumulation rule:');
      expect(html).toContain('Never extrapolate beyond available');
      expect(html).toContain('Estimated slippage: 0.45% across 3 book levels');

      // No recommendation language
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders INSUFFICIENT DEPTH card with covered notional, dashes for unextrapolated metrics, and notice', () => {
      const insufficientResult: DepthStressResult = {
        state: 'insufficient_depth',
        observedAtUtc: '2026-09-23T14:30:00.000Z',
        side: 'buy',
        requestedNotionalUsdt: 10000,
        coveredNotionalUsdt: 2450.5,
        levelsConsumed: 5,
        estimatedVwapPct: null,
        slippagePct: null,
        reason: 'Requested notional exceeds total available order-book depth',
      };

      const html = renderToStaticMarkup(
        React.createElement(WeekendDepthCheckCard, { result: insufficientResult })
      );

      // Title and INSUFFICIENT DEPTH badge
      expect(html).toContain('Weekend depth check');
      expect(html).toContain('INSUFFICIENT DEPTH');
      expect(html).toContain('depthDotInsufficient');

      // Covered vs Requested
      expect(html).toContain('10,000 USDT');
      expect(html).toContain('2,450.5 USDT');
      expect(html).toContain('5');
      // Slippage is NOT extrapolated
      expect(html).toContain('—');

      // HOW disclosure explains insufficient depth
      expect(html).toContain('never extrapolates');

      // No recommendation language
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders UNAVAILABLE card with honest reason and fallback dashes', () => {
      const unavailableResult: DepthStressResult = {
        state: 'unavailable',
        observedAtUtc: null,
        side: 'buy',
        requestedNotionalUsdt: 5000,
        coveredNotionalUsdt: null,
        levelsConsumed: null,
        estimatedVwapPct: null,
        slippagePct: null,
        reason: 'Bitget request timed out after 4000ms',
      };

      const html = renderToStaticMarkup(
        React.createElement(WeekendDepthCheckCard, { result: unavailableResult })
      );

      expect(html).toContain('Weekend depth check');
      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain('depthDotUnavailable');
      expect(html).toContain('Bitget request timed out after 4000ms');

      // All metrics fallback to dash
      expect(html).toContain('—');

      // No recommendation language
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });
  });

  describe('evidence row integration & sourceLinkKind contract', () => {
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

    it('sourceLinkKind returns null for bitget_orderbook (remains plain text, no link)', () => {
      expect(sourceLinkKind('bitget_orderbook')).toBeNull();
    });

    it('buildSourceHref returns null for bitget_orderbook', () => {
      const liveEvidence: EvidenceItem = {
        label: 'observed',
        source: 'bitget_orderbook',
        timestampUtc: '2026-09-23T14:30:00.000Z',
        note: 'Bitget public order book depth: estimated slippage 0.45% across 3 levels for 5,000 USDT notional',
      };
      expect(buildSourceHref(liveEvidence, trade)).toBeNull();

      const unavailEvidence: EvidenceItem = {
        label: 'estimated',
        source: 'bitget_orderbook',
        timestampUtc: null,
        note: 'Bitget public order book depth unavailable; pinned replay values in use below.',
      };
      expect(buildSourceHref(unavailEvidence, trade)).toBeNull();
    });
  });
});

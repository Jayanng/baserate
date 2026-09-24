import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MarketContextPanel, {
  formatSnapshotTime,
  getLatestObservedTime,
} from '@/components/dossier/MarketContextPanel';
import type { LiveMarketSnapshot } from '@/src/data/live-market-snapshot';
import type { DepthStressResult } from '@/src/engine/depth-stress';
import type { McpEventContext, MarketSentimentResult } from '@/src/data/mcp-client';
import { sourceLinkKind, buildSourceHref } from '@/components/dossier/source-links';
import type { EvidenceItem, ParsedTrade } from '@/src/domain/types';

describe('MarketContextPanel component & evidence flow', () => {
  const FORBIDDEN_WORDS_REGEX =
    /\b(buy\s+now|sell\s+now|hold\b|safe\b|unsafe\b|safer\b|safest\b|advice\b|recommend\b|recommendation\b)\b/i;

  const mockLiveSnapshot: LiveMarketSnapshot = {
    state: 'live',
    retrievedAtUtc: '2026-09-23T15:20:30.000Z',
    spotPrice: 228.2,
    fundingRate: 0.000219,
    rTokenSymbol: 'RNVDAUSDT',
    perpSymbol: 'NVDAUSDT',
    sourceLabel: {
      spotPrice: 'bitget_spot',
      fundingRate: 'bitget_mix',
    },
    reason: null,
  };

  const mockUnavailableSnapshot: LiveMarketSnapshot = {
    state: 'unavailable',
    retrievedAtUtc: null,
    spotPrice: null,
    fundingRate: null,
    rTokenSymbol: 'RNVDAUSDT',
    perpSymbol: 'NVDAUSDT',
    sourceLabel: {
      spotPrice: 'bitget_spot',
      fundingRate: 'bitget_mix',
    },
    reason: 'Bitget request timed out after 4000ms',
  };

  const mockLiveDepth: DepthStressResult = {
    state: 'ok',
    observedAtUtc: '2026-09-23T15:20:31.000Z',
    side: 'buy',
    requestedNotionalUsdt: 5000,
    coveredNotionalUsdt: 5000,
    levelsConsumed: 3,
    estimatedVwapPct: 0.4528,
    slippagePct: 0.4528,
    reason: null,
  };

  const mockInsufficientDepth: DepthStressResult = {
    state: 'insufficient_depth',
    observedAtUtc: '2026-09-23T15:20:31.000Z',
    side: 'buy',
    requestedNotionalUsdt: 10000,
    coveredNotionalUsdt: 2450.5,
    levelsConsumed: 5,
    estimatedVwapPct: null,
    slippagePct: null,
    reason: 'Requested notional exceeds total available order-book depth',
  };

  const mockUnavailableDepth: DepthStressResult = {
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

  const mockLiveEventWithDate: McpEventContext = {
    state: 'live',
    retrievedAtUtc: '2026-09-23T15:20:32.000Z',
    symbol: 'NVDA',
    nextEarningsDate: '2026-11-19',
    daysUntilEarnings: 27,
    withinSevenDaysOfReopen: true,
    reason: null,
  };

  const mockLiveEventEmpty: McpEventContext = {
    state: 'live',
    retrievedAtUtc: '2026-09-23T15:20:32.000Z',
    symbol: 'QQQ',
    nextEarningsDate: null,
    daysUntilEarnings: null,
    withinSevenDaysOfReopen: null,
    reason: null,
  };

  const mockUnavailableEvent: McpEventContext = {
    state: 'unavailable',
    retrievedAtUtc: null,
    symbol: 'NVDA',
    nextEarningsDate: null,
    daysUntilEarnings: null,
    withinSevenDaysOfReopen: null,
    reason: 'Bitget MCP request timed out after 5000ms',
  };

  const mockLiveSentimentDown: MarketSentimentResult = {
    state: 'live',
    retrievedAtUtc: '2026-09-23T15:20:33.000Z',
    score: 34.7,
    rating: 'fear',
    previousClose: 35.2,
    previous1Month: 54.7,
    reason: null,
  };

  const mockLiveSentimentUp: MarketSentimentResult = {
    state: 'live',
    retrievedAtUtc: '2026-09-23T15:20:33.000Z',
    score: 62.4,
    rating: 'greed',
    previousClose: 58.1,
    previous1Month: 45.0,
    reason: null,
  };

  const mockUnavailableSentiment: MarketSentimentResult = {
    state: 'unavailable',
    retrievedAtUtc: null,
    score: null,
    rating: null,
    previousClose: null,
    previous1Month: null,
    reason: 'Bitget MCP request timed out after 5000ms',
  };

  describe('formatSnapshotTime & getLatestObservedTime', () => {
    it('formats ISO string to HH:MM:SS UTC', () => {
      const formatted = formatSnapshotTime('2026-09-23T14:32:05.123Z');
      expect(formatted).toBe('14:32:05 UTC');
    });

    it('returns "waiting" for null or empty inputs in formatSnapshotTime', () => {
      expect(formatSnapshotTime(null)).toBe('waiting');
      expect(formatSnapshotTime('')).toBe('waiting');
      expect(formatSnapshotTime('not-a-date')).toBe('not-a-date');
    });

    it('getLatestObservedTime picks the latest timestamp among all three contexts', () => {
      const latest = getLatestObservedTime(
        mockLiveSnapshot,
        mockLiveDepth,
        mockLiveEventWithDate
      );
      // 15:20:32 is the latest
      expect(latest).toBe('15:20:32 UTC');
    });

    it('getLatestObservedTime includes sentiment timestamp and picks latest', () => {
      const latest = getLatestObservedTime(
        mockLiveSnapshot,
        mockLiveDepth,
        mockLiveEventWithDate,
        mockLiveSentimentDown
      );
      // 15:20:33 is latest from sentiment
      expect(latest).toBe('15:20:33 UTC');
    });

    it('getLatestObservedTime returns "waiting" when all timestamps are null', () => {
      const latest = getLatestObservedTime(
        mockUnavailableSnapshot,
        mockUnavailableDepth,
        mockUnavailableEvent,
        mockUnavailableSentiment
      );
      expect(latest).toBe('waiting');
    });
  });

  describe('loading neutrality & waiting copy', () => {
    it('renders the panel and four waiting lines when all props are null', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: null,
          depth: null,
          event: null,
          sentiment: null,
        })
      );
      expect(html).toContain('MARKET CONTEXT');
      expect(html).toContain('Current public market, book, and calendar');
      expect(html).toContain('Observed:');
      expect(html).toContain('waiting');
      expect(html).toContain('Price &amp; funding');
      expect(html).toContain('waiting on Bitget');
      expect(html).toContain('Weekend depth');
      expect(html).toContain('waiting on the public book');
      expect(html).toContain('Event calendar');
      expect(html).toContain('checking the next earnings date');
      expect(html).toContain('Market sentiment');
      expect(html).toContain('waiting on market signal');
      expect(html).not.toContain('Loading price and funding');
      expect(html).not.toContain('Loading depth');
      expect(html).not.toContain('Loading earnings calendar');
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });
  });

  describe('all-live rendering state', () => {
    it('renders consolidated panel with latest timestamp and all 3 rows in LIVE OBSERVED state', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
        })
      );

      // Panel header
      expect(html).toContain('MARKET CONTEXT');
      expect(html).toContain('Current public market, book, and calendar');
      expect(html).toContain('Observed:');
      expect(html).toContain('15:20:32 UTC');

      // Row 1: Price & Funding
      expect(html).toContain('Price &amp; funding');
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');

      // Row 2: Weekend Depth
      expect(html).toContain('Weekend depth');
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain(
        'estimated slippage 0.45% · 3 levels · estimate only'
      );

      // Row 3: Event Calendar
      expect(html).toContain('Event calendar');
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('next earnings 2026-11-19 · in 27 days');
      expect(html).toContain(
        'This date falls within 7 days of the Monday reopen.'
      );

      // Zero forbidden words & no em dash
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });
  });

  describe('independent row failure isolation', () => {
    it('Row 1 fails independently (snapshot unavailable, depth and event live)', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockUnavailableSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
        })
      );

      // Row 1 is unavailable
      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'unavailable · Bitget request timed out after 4000ms'
      );

      // Row 2 and Row 3 remain live
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain(
        'estimated slippage 0.45% · 3 levels · estimate only'
      );
      expect(html).toContain('next earnings 2026-11-19 · in 27 days');
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('Row 2 fails with insufficient depth independently (snapshot and event live)', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockInsufficientDepth,
          event: mockLiveEventWithDate,
        })
      );

      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'book does not cover this size · covered 2,450.5 USDT'
      );
      // Rows 1 and 3 are live
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');
      expect(html).toContain('next earnings 2026-11-19 · in 27 days');
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('Row 2 fails with unavailable independently', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockUnavailableDepth,
          event: mockLiveEventWithDate,
        })
      );

      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'unavailable · Bitget request timed out after 4000ms'
      );
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');
      expect(html).toContain('next earnings 2026-11-19 · in 27 days');
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('Row 3 fails independently with unavailable reason (snapshot and depth live)', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockUnavailableEvent,
        })
      );

      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'unavailable · Bitget MCP request timed out after 5000ms'
      );

      // Rows 1 and 2 remain live
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');
      expect(html).toContain(
        'estimated slippage 0.45% · 3 levels · estimate only'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('all rows unavailable renders each failure honestly without throwing', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockUnavailableSnapshot,
          depth: mockUnavailableDepth,
          event: mockUnavailableEvent,
        })
      );

      expect(html).toContain('MARKET CONTEXT');
      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'unavailable · Bitget request timed out after 4000ms'
      );
      expect(html).toContain(
        'unavailable · Bitget MCP request timed out after 5000ms'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });
  });

  describe('event row specific behaviors', () => {
    it('renders live badge and clean note when live with no scheduled earnings (e.g. QQQ ETF)', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventEmpty,
        })
      );

      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain('no scheduled earnings found');
      expect(html).not.toContain(
        'This date falls within 7 days of the Monday reopen.'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('omits 7-day notice when next earnings is more than 7 days past reopen', () => {
      const farEvent: McpEventContext = {
        ...mockLiveEventWithDate,
        withinSevenDaysOfReopen: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: farEvent,
        })
      );

      expect(html).toContain('next earnings 2026-11-19 · in 27 days');
      expect(html).not.toContain(
        'This date falls within 7 days of the Monday reopen.'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });
  });

  describe('Row 4: Market sentiment row behaviors', () => {
    it('renders live state with down-from comparison and HOW disclosure', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          sentiment: mockLiveSentimentDown,
        })
      );

      // Label and live badge
      expect(html).toContain('Market sentiment');
      expect(html).toContain('LIVE OBSERVED');

      // Value text: 34.7 (fear) down from 54.7 one month ago
      expect(html).toContain(
        'Fear &amp; Greed Index: 34.7 (fear) down from 54.7 one month ago'
      );

      // HOW disclosure contents
      expect(html).toContain('bitget-signal sentiment_market_fear_greed');
      expect(html).toContain('Global crypto market sentiment index');
      expect(html).toContain('15:20:33 UTC');

      // No em dash, no forbidden advice words
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders live state with up-from comparison', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          sentiment: mockLiveSentimentUp,
        })
      );

      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain(
        'Fear &amp; Greed Index: 62.4 (greed) up from 45 one month ago'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders unavailable state with peach badge and reason', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          sentiment: mockUnavailableSentiment,
        })
      );

      expect(html).toContain('Market sentiment');
      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain(
        'unavailable · Bitget MCP request timed out after 5000ms'
      );
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('renders null state with waiting on market signal', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          sentiment: null,
        })
      );

      expect(html).toContain('Market sentiment');
      expect(html).toContain('waiting on market signal');
      expect(html).not.toContain('—');
      expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
    });

    it('isolates Row 4 failure when other rows are live', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockLiveSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          sentiment: mockUnavailableSentiment,
        })
      );

      // Rows 1, 2, 3 remain LIVE OBSERVED
      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');
      expect(html).toContain(
        'estimated slippage 0.45% · 3 levels · estimate only'
      );
      expect(html).toContain('next earnings 2026-11-19 · in 27 days');

      // Row 4 is UNAVAILABLE
      expect(html).toContain(
        'unavailable · Bitget MCP request timed out after 5000ms'
      );
    });

    it('isolates Row 4 live when other rows are unavailable', () => {
      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: mockUnavailableSnapshot,
          depth: mockUnavailableDepth,
          event: mockUnavailableEvent,
          sentiment: mockLiveSentimentDown,
        })
      );

      // Header observed timestamp reflects sentiment
      expect(html).toContain('15:20:33 UTC');

      // Row 4 is LIVE OBSERVED
      expect(html).toContain('LIVE OBSERVED');
      expect(html).toContain(
        'Fear &amp; Greed Index: 34.7 (fear) down from 54.7 one month ago'
      );

      // Rows 1, 2, 3 are UNAVAILABLE
      expect(html).toContain('UNAVAILABLE');
    });
  });

  describe('evidence table integration & source-links contracts', () => {
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

    it('sourceLinkKind returns null for mcp_earnings, bitget_signal, bitget_live, and bitget_orderbook (plain text)', () => {
      expect(sourceLinkKind('mcp_earnings')).toBeNull();
      expect(sourceLinkKind('bitget_signal')).toBeNull();
      expect(sourceLinkKind('bitget_live')).toBeNull();
      expect(sourceLinkKind('bitget_orderbook')).toBeNull();

      expect(sourceLinkKind('bitget_spot')).toBe('live');
      expect(sourceLinkKind('bitget_mix')).toBe('live');
      expect(sourceLinkKind('yahoo_native')).toBe('live');
    });

    it('buildSourceHref returns null for mcp_earnings in all states', () => {
      const liveWithDateEvidence: EvidenceItem = {
        label: 'observed',
        source: 'mcp_earnings',
        timestampUtc: '2026-09-23T15:20:32.000Z',
        note: 'Next earnings 2026-11-19 (in 27 days), source bitget-mcp-server equity_calendar',
      };
      expect(buildSourceHref(liveWithDateEvidence, trade)).toBeNull();

      const liveEmptyEvidence: EvidenceItem = {
        label: 'estimated',
        source: 'mcp_earnings',
        timestampUtc: '2026-09-23T15:20:32.000Z',
        note: 'no scheduled earnings found',
      };
      expect(buildSourceHref(liveEmptyEvidence, trade)).toBeNull();

      const unavailEvidence: EvidenceItem = {
        label: 'estimated',
        source: 'mcp_earnings',
        timestampUtc: null,
        note: 'bitget-mcp-server event context unavailable; pinned replay values in use below.',
      };
      expect(buildSourceHref(unavailEvidence, trade)).toBeNull();
    });
  });

  describe('instrument identification in Row 1 (Price & funding)', () => {
    it('defaults to RNVDAUSDT spot ... · NVDAUSDT funding ... when symbols are not specified in snapshot', () => {
      const snapshotWithoutSymbols: LiveMarketSnapshot = {
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
        React.createElement(MarketContextPanel, {
          snapshot: snapshotWithoutSymbols,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
        })
      );

      expect(html).toContain('RNVDAUSDT spot 228.2 · NVDAUSDT funding 0.000219');
    });

    it('renders exact instruments from snapshot for non-default assets (e.g. RTSLAUSDT and TSLAUSDT)', () => {
      const tslaSnapshot: LiveMarketSnapshot = {
        state: 'live',
        retrievedAtUtc: '2026-09-23T15:20:30.000Z',
        spotPrice: 410.5,
        fundingRate: 0.00015,
        rTokenSymbol: 'RTSLAUSDT',
        perpSymbol: 'TSLAUSDT',
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: tslaSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
        })
      );

      expect(html).toContain('RTSLAUSDT spot 410.5 · TSLAUSDT funding 0.00015');
      expect(html).not.toContain('RNVDAUSDT');
    });

    it('renders exact instruments from props when snapshot does not carry them', () => {
      const bareSnapshot: LiveMarketSnapshot = {
        state: 'live',
        retrievedAtUtc: '2026-09-23T15:20:30.000Z',
        spotPrice: 180.25,
        fundingRate: 0.00008,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: bareSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
          rTokenSymbol: 'RAAPLUSDT',
          perpSymbol: 'AAPLUSDT',
        })
      );

      expect(html).toContain('RAAPLUSDT spot 180.25 · AAPLUSDT funding 0.00008');
    });

    it('preserves unavailable state and reason without crashing when snapshot is unavailable', () => {
      const unavailSnapshot: LiveMarketSnapshot = {
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        rTokenSymbol: 'RNVDAUSDT',
        perpSymbol: 'NVDAUSDT',
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: 'asset not in replay allowlist',
      };

      const html = renderToStaticMarkup(
        React.createElement(MarketContextPanel, {
          snapshot: unavailSnapshot,
          depth: mockLiveDepth,
          event: mockLiveEventWithDate,
        })
      );

      expect(html).toContain('UNAVAILABLE');
      expect(html).toContain('unavailable · asset not in replay allowlist');
      expect(html).not.toContain('spot null');
    });
  });
});

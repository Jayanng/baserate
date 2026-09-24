import React from 'react';
import type { LiveMarketSnapshot } from '@/src/data/live-market-snapshot';
import type { DepthStressResult } from '@/src/engine/depth-stress';
import type { McpEventContext, MarketSentimentResult } from '@/src/data/mcp-client';
import styles from './DossierPage.module.css';

export interface MarketContextPanelProps {
  snapshot: LiveMarketSnapshot | null;
  depth: DepthStressResult | null;
  event: McpEventContext | null;
  sentiment?: MarketSentimentResult | null;
}

export function formatSnapshotTime(iso: string | null): string {
  if (!iso) return 'waiting';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(11, 19) + ' UTC';
  } catch {
    return iso;
  }
}

export function formatSentimentText(sentiment: MarketSentimentResult): string {
  const base = `Fear & Greed Index: ${sentiment.score} (${sentiment.rating ?? 'neutral'})`;
  if (
    sentiment.previous1Month !== null &&
    sentiment.score !== null &&
    sentiment.score !== sentiment.previous1Month
  ) {
    const diff =
      sentiment.score < sentiment.previous1Month
        ? ` down from ${sentiment.previous1Month} one month ago`
        : ` up from ${sentiment.previous1Month} one month ago`;
    return `${base}${diff}`;
  }
  return base;
}

export function getLatestObservedTime(
  snapshot: LiveMarketSnapshot | null,
  depth: DepthStressResult | null,
  event: McpEventContext | null,
  sentiment?: MarketSentimentResult | null
): string {
  const timestamps: number[] = [];
  if (snapshot?.retrievedAtUtc) {
    const t = new Date(snapshot.retrievedAtUtc).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }
  if (depth?.observedAtUtc) {
    const t = new Date(depth.observedAtUtc).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }
  if (event?.retrievedAtUtc) {
    const t = new Date(event.retrievedAtUtc).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }
  if (sentiment?.retrievedAtUtc) {
    const t = new Date(sentiment.retrievedAtUtc).getTime();
    if (!Number.isNaN(t)) timestamps.push(t);
  }
  if (timestamps.length === 0) {
    return 'waiting';
  }
  const maxMs = Math.max(...timestamps);
  return formatSnapshotTime(new Date(maxMs).toISOString());
}

function renderBadge(state: 'live' | 'unavailable') {
  if (state === 'live') {
    return (
      <span className={`${styles.marketContextBadge} ${styles.marketContextBadgeLive}`}>
        <span
          className={`${styles.marketContextDot} ${styles.marketContextDotLive}`}
          aria-hidden="true"
        />
        LIVE OBSERVED
      </span>
    );
  }
  return (
    <span
      className={`${styles.marketContextBadge} ${styles.marketContextBadgeUnavailable}`}
    >
      <span
        className={`${styles.marketContextDot} ${styles.marketContextDotUnavailable}`}
        aria-hidden="true"
      />
      UNAVAILABLE
    </span>
  );
}

export default function MarketContextPanel({
  snapshot,
  depth,
  event,
  sentiment = null,
}: MarketContextPanelProps) {
  const latestTime = getLatestObservedTime(snapshot, depth, event, sentiment);

  return (
    <section
      className={styles.marketContextPanel}
      role="region"
      aria-label="Market context"
    >
      <div className={styles.marketContextHeader}>
        <div className={styles.marketContextTitleGroup}>
          <h3 className={styles.marketContextTitle}>MARKET CONTEXT</h3>
          <p className={styles.marketContextSubtitle}>
            Current public market, book, and calendar
          </p>
        </div>
        <div className={styles.marketContextObserved}>
          <span className={styles.marketContextObservedLabel}>Observed: </span>
          <span className={styles.marketContextObservedVal}>{latestTime}</span>
        </div>
      </div>

      <div className={styles.marketContextRows}>
        {/* Row 1: Price & Funding */}
        <div
          className={styles.marketContextRow}
          role="group"
          aria-label="Price and funding"
        >
          <div className={styles.marketContextRowHeader}>
            <span className={styles.marketContextRowLabel}>Price & funding</span>
            {snapshot &&
              renderBadge(snapshot.state === 'live' ? 'live' : 'unavailable')}
          </div>
          <div className={styles.marketContextRowContent}>
            {!snapshot ? (
              <span className={styles.marketContextPending}>waiting on Bitget</span>
            ) : snapshot.state === 'live' ? (
              <span className={styles.marketContextRowMain}>
                {`spot ${snapshot.spotPrice} · funding ${snapshot.fundingRate}`}
              </span>
            ) : (
              <span className={styles.marketContextRowMain}>
                {`unavailable · ${snapshot.reason ?? 'market data unavailable'}`}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Weekend Depth */}
        <div
          className={styles.marketContextRow}
          role="group"
          aria-label="Weekend depth"
        >
          <div className={styles.marketContextRowHeader}>
            <span className={styles.marketContextRowLabel}>Weekend depth</span>
            {depth &&
              renderBadge(depth.state === 'ok' ? 'live' : 'unavailable')}
          </div>
          <div className={styles.marketContextRowContent}>
            {!depth ? (
              <span className={styles.marketContextPending}>
                waiting on the public book
              </span>
            ) : depth.state === 'ok' ? (
              <span className={styles.marketContextRowMain}>
                {`estimated slippage ${
                  depth.slippagePct !== null ? depth.slippagePct.toFixed(2) : '0.00'
                }% · ${depth.levelsConsumed ?? 0} levels · estimate only`}
              </span>
            ) : depth.state === 'insufficient_depth' ? (
              <span className={styles.marketContextRowMain}>
                {`book does not cover this size · covered ${
                  depth.coveredNotionalUsdt !== null
                    ? `${Number(depth.coveredNotionalUsdt.toFixed(2)).toLocaleString()} USDT`
                    : '0 USDT'
                }`}
              </span>
            ) : (
              <span className={styles.marketContextRowMain}>
                {`unavailable · ${depth.reason ?? 'order book depth data unavailable'}`}
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Event Calendar */}
        <div
          className={styles.marketContextRow}
          role="group"
          aria-label="Event calendar"
        >
          <div className={styles.marketContextRowHeader}>
            <span className={styles.marketContextRowLabel}>Event calendar</span>
            {event &&
              renderBadge(event.state === 'live' ? 'live' : 'unavailable')}
          </div>
          <div className={styles.marketContextRowContent}>
            {!event ? (
              <span className={styles.marketContextPending}>
                checking the next earnings date
              </span>
            ) : event.state === 'live' && event.nextEarningsDate !== null ? (
              <>
                <span className={styles.marketContextRowMain}>
                  {`next earnings ${event.nextEarningsDate} · in ${event.daysUntilEarnings} days`}
                </span>
                {event.withinSevenDaysOfReopen && (
                  <span className={styles.marketContextNotice}>
                    This date falls within 7 days of the Monday reopen.
                  </span>
                )}
              </>
            ) : event.state === 'live' && event.nextEarningsDate === null ? (
              <span className={styles.marketContextRowMain}>
                no scheduled earnings found
              </span>
            ) : (
              <span className={styles.marketContextRowMain}>
                {`unavailable · ${event.reason ?? 'event context unavailable'}`}
              </span>
            )}
          </div>
        </div>

        {/* Row 4: Market Sentiment */}
        <div
          className={styles.marketContextRow}
          role="group"
          aria-label="Market sentiment"
          data-label="MARKET SENTIMENT"
        >
          <div className={styles.marketContextRowHeader}>
            <span
              className={styles.marketContextRowLabel}
              aria-label="MARKET SENTIMENT"
            >
              Market sentiment
            </span>
            {sentiment &&
              renderBadge(sentiment.state === 'live' ? 'live' : 'unavailable')}
          </div>
          <div className={styles.marketContextRowContent}>
            {!sentiment ? (
              <span className={styles.marketContextPending}>
                waiting on market signal
              </span>
            ) : sentiment.state === 'live' && sentiment.score !== null ? (
              <span className={styles.marketContextRowMain}>
                {formatSentimentText(sentiment)}
              </span>
            ) : (
              <span className={styles.marketContextRowMain}>
                {`unavailable · ${sentiment.reason ?? 'market sentiment unavailable'}`}
              </span>
            )}
            <details className={`${styles.metricHow} ${styles.marketContextHow}`}>
              <summary className={styles.metricHowSummary}>
                <span>HOW</span>
                <svg
                  className={styles.metricHowIcon}
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 2v8M2 6h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </summary>
              <div className={styles.metricHowBody}>
                <div className={styles.metricHowRow}>
                  <span className={styles.metricHowKey}>source:</span>{' '}
                  <span className={styles.metricHowVal}>
                    bitget-signal sentiment_market_fear_greed
                  </span>
                </div>
                <div className={styles.metricHowRow}>
                  <span className={styles.metricHowKey}>observed:</span>{' '}
                  <span className={styles.metricHowVal}>
                    {sentiment?.retrievedAtUtc
                      ? formatSnapshotTime(sentiment.retrievedAtUtc)
                      : 'waiting'}
                  </span>
                </div>
                <div className={styles.metricHowRow}>
                  <span className={styles.metricHowKey}>scope:</span>{' '}
                  <span className={styles.metricHowVal}>
                    Global crypto market sentiment index
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

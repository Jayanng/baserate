import React from 'react';
import type { DepthStressResult } from '@/src/engine/depth-stress';
import { formatSnapshotTime } from './LiveMarketSnapshotStrip';
import styles from './DossierPage.module.css';

export interface WeekendDepthCheckCardProps {
  result: DepthStressResult | null;
}

export default function WeekendDepthCheckCard({
  result,
}: WeekendDepthCheckCardProps) {
  if (!result) {
    return null;
  }

  const isLive = result.state === 'ok';
  const isInsufficient = result.state === 'insufficient_depth';
  const isUnavailable = result.state === 'unavailable';

  let badgeLabel = 'UNAVAILABLE';
  let badgeClass = styles.depthBadgeUnavailable;
  let dotClass = styles.depthDotUnavailable;

  if (isLive) {
    badgeLabel = 'LIVE OBSERVED';
    badgeClass = styles.depthBadgeLive;
    dotClass = styles.depthDotLive;
  } else if (isInsufficient) {
    badgeLabel = 'INSUFFICIENT DEPTH';
    badgeClass = styles.depthBadgeInsufficient;
    dotClass = styles.depthDotInsufficient;
  }

  const observedTime = formatSnapshotTime(result.observedAtUtc);
  const requestedDisplay = `${result.requestedNotionalUsdt.toLocaleString()} USDT`;
  const coveredDisplay =
    result.coveredNotionalUsdt !== null
      ? `${Number(result.coveredNotionalUsdt.toFixed(2)).toLocaleString()} USDT`
      : '—';
  const levelsDisplay =
    result.levelsConsumed !== null ? String(result.levelsConsumed) : '—';
  const slippageDisplay =
    result.slippagePct !== null ? `${result.slippagePct.toFixed(2)}%` : '—';

  let howResultText = '';
  if (isLive) {
    howResultText = `Estimated slippage: ${slippageDisplay} across ${levelsDisplay} book levels (estimate only)`;
  } else if (isInsufficient) {
    howResultText = `Insufficient depth: book only covers ${coveredDisplay} of ${requestedDisplay} requested (never extrapolates)`;
  } else {
    howResultText = `Unavailable: ${result.reason ?? 'Order book depth data unavailable'}`;
  }

  return (
    <div
      className={styles.depthCard}
      role="region"
      aria-label="Weekend depth check"
    >
      <div className={styles.depthHeader}>
        <div className={styles.depthHeaderLeft}>
          <h3 className={styles.depthTitle}>Weekend depth check</h3>
          <p className={styles.depthSubtitle}>
            Public order book snapshot - estimate only - no order sent
          </p>
        </div>
        <div className={`${styles.depthBadge} ${badgeClass}`}>
          <span className={`${styles.depthDot} ${dotClass}`} aria-hidden="true" />
          {badgeLabel}
        </div>
      </div>

      {isUnavailable && result.reason && (
        <div className={styles.depthReasonNotice} role="status">
          Unavailable: {result.reason}
        </div>
      )}

      <div className={styles.depthGrid}>
        <div className={styles.depthMetricTile}>
          <span className={styles.depthMetricLabel}>Observed (UTC)</span>
          <span className={styles.depthMetricValue}>{observedTime}</span>
        </div>
        <div className={styles.depthMetricTile}>
          <span className={styles.depthMetricLabel}>Requested notional</span>
          <span className={styles.depthMetricValue}>{requestedDisplay}</span>
        </div>
        <div className={styles.depthMetricTile}>
          <span className={styles.depthMetricLabel}>Covered notional</span>
          <span className={styles.depthMetricValue}>{coveredDisplay}</span>
        </div>
        <div className={styles.depthMetricTile}>
          <span className={styles.depthMetricLabel}>Levels consumed</span>
          <span className={styles.depthMetricValue}>{levelsDisplay}</span>
        </div>
        <div className={styles.depthMetricTile}>
          <span className={styles.depthMetricLabel}>Estimated slippage</span>
          <span className={styles.depthMetricValue}>{slippageDisplay}</span>
        </div>
      </div>

      <details className={styles.metricHow}>
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
            <span className={styles.metricHowKey}>side:</span>{' '}
            <span className={styles.metricHowVal}>{result.side}</span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>requested:</span>{' '}
            <span className={styles.metricHowVal}>{requestedDisplay}</span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>covered:</span>{' '}
            <span className={styles.metricHowVal}>{coveredDisplay}</span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>levels:</span>{' '}
            <span className={styles.metricHowVal}>{levelsDisplay}</span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>accumulation rule:</span>{' '}
            <span className={styles.metricHowVal}>
              Walk levels in order book order (asks ascending for buy side, bids
              descending for sell side), accumulating notional = price * size until
              requested notional is covered. Estimated VWAP = total covered
              notional / total base units. Slippage is measured relative to
              reference price (cost basis). Never extrapolate beyond available
              book depth.
            </span>
          </div>
          <div className={styles.metricHowDivider} />
          <div className={`${styles.metricHowRow} ${styles.metricHowResultRow}`}>
            <span className={styles.metricHowKey}>result:</span>{' '}
            <span className={styles.metricHowResultVal}>{howResultText}</span>
          </div>
        </div>
      </details>
    </div>
  );
}

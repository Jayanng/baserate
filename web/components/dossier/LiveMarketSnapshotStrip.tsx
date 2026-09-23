import React from 'react';
import type { LiveMarketSnapshot } from '@/src/data/live-market-snapshot';
import styles from './DossierPage.module.css';

export interface LiveMarketSnapshotStripProps {
  snapshot: LiveMarketSnapshot | null;
}

export function formatSnapshotTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(11, 19) + ' UTC';
  } catch {
    return iso;
  }
}

export default function LiveMarketSnapshotStrip({
  snapshot,
}: LiveMarketSnapshotStripProps) {
  if (!snapshot) {
    return null;
  }

  if (snapshot.state === 'live') {
    return (
      <div
        className={styles.liveStrip}
        role="region"
        aria-label="Current market snapshot"
      >
        <span className={styles.liveStripPrefix}>Current market snapshot:</span>
        <span className={`${styles.liveStripBadge} ${styles.liveStripBadgeLive}`}>
          <span
            className={`${styles.liveStripDot} ${styles.liveStripDotLive}`}
            aria-hidden="true"
          />
          LIVE OBSERVED
        </span>
        <span className={styles.liveStripDetails}>
          Bitget public REST, retrieved {formatSnapshotTime(snapshot.retrievedAtUtc)}, spot {snapshot.spotPrice}, funding {snapshot.fundingRate}
        </span>
      </div>
    );
  }

  return (
    <div
      className={styles.liveStrip}
      role="region"
      aria-label="Current market snapshot"
    >
      <span className={styles.liveStripPrefix}>CURRENT MARKET SNAPSHOT:</span>
      <span
        className={`${styles.liveStripBadge} ${styles.liveStripBadgeUnavailable}`}
      >
        <span
          className={`${styles.liveStripDot} ${styles.liveStripDotUnavailable}`}
          aria-hidden="true"
        />
        UNAVAILABLE
      </span>
      <span className={styles.liveStripDetails}>
        {snapshot.reason ?? 'market data unavailable'}, pinned replay values in use below.
      </span>
    </div>
  );
}

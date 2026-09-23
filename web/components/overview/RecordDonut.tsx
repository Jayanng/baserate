'use client';

import React from 'react';
import styles from './OverviewPage.module.css';

export interface RecordDonutProps {
  hits: number;
  misses: number;
  pending: number;
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~282.743

export default function RecordDonut({ hits, misses, pending }: RecordDonutProps) {
  const total = hits + misses + pending;

  const hitsLength = total > 0 ? (hits / total) * CIRCUMFERENCE : 0;
  const missesLength = total > 0 ? (misses / total) * CIRCUMFERENCE : 0;
  const pendingLength = total > 0 ? (pending / total) * CIRCUMFERENCE : 0;

  const missesOffset = -hitsLength;
  const pendingOffset = -(hitsLength + missesLength);

  return (
    <div className={styles.donutContainer} role="region" aria-label="Forecast record calibration donut">
      <div className={styles.donutSvgWrap}>
        <svg
          viewBox="0 0 120 120"
          className={styles.donutSvg}
          aria-hidden="true"
        >
          {/* Remainder / background track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            className={styles.donutTrack}
          />

          {/* Hits segment (Lime) */}
          {hitsLength > 0 && (
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className={styles.donutSegmentHits}
              strokeDasharray={`${hitsLength} ${CIRCUMFERENCE - hitsLength}`}
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
            />
          )}

          {/* Misses segment (Coral) */}
          {missesLength > 0 && (
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className={styles.donutSegmentMisses}
              strokeDasharray={`${missesLength} ${CIRCUMFERENCE - missesLength}`}
              strokeDashoffset={missesOffset}
              transform="rotate(-90 60 60)"
            />
          )}

          {/* Pending segment (Peach) */}
          {pendingLength > 0 && (
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className={styles.donutSegmentPending}
              strokeDasharray={`${pendingLength} ${CIRCUMFERENCE - pendingLength}`}
              strokeDashoffset={pendingOffset}
              transform="rotate(-90 60 60)"
            />
          )}
        </svg>

        {/* Center total number (3xl extrabold tabular) */}
        <div className={styles.donutCenterGroup}>
          <span className={styles.donutCenterNumber}>{total}</span>
          <span className={styles.donutCenterLabel}>total</span>
        </div>
      </div>

      {/* Legend on the right */}
      <div className={styles.donutLegend}>
        <div className={styles.legendRow}>
          <div className={styles.legendLeft}>
            <span className={`${styles.legendDot} ${styles.legendDotLime}`} />
            <span className={styles.legendLabel}>Inside band</span>
          </div>
          <span className={styles.legendCount}>{hits}</span>
        </div>

        <div className={styles.legendRow}>
          <div className={styles.legendLeft}>
            <span className={`${styles.legendDot} ${styles.legendDotCoral}`} />
            <span className={styles.legendLabel}>Missed</span>
          </div>
          <span className={styles.legendCount}>{misses}</span>
        </div>

        <div className={styles.legendRow}>
          <div className={styles.legendLeft}>
            <span className={`${styles.legendDot} ${styles.legendDotPeach}`} />
            <span className={styles.legendLabel}>Pending grade</span>
          </div>
          <span className={styles.legendCount}>{pending}</span>
        </div>
      </div>
    </div>
  );
}

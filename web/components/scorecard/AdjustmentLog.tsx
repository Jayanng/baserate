'use client';

import React from 'react';
import { type BandAdjustment } from '@/src/scorekeeper/calibration';
import styles from './ScorecardPage.module.css';

export interface AdjustmentLogProps {
  adjustments: BandAdjustment[];
}

function formatUtcTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} · ${hours}:${minutes} UTC`;
  } catch {
    return isoStr;
  }
}

export default function AdjustmentLog({ adjustments }: AdjustmentLogProps) {
  if (adjustments.length === 0) {
    return (
      <div className={styles.adjustEmpty} role="status">
        <svg
          className={styles.adjustEmptyIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>
          No adjustments this cycle &mdash; all regimes inside tolerance
        </span>
      </div>
    );
  }

  return (
    <div className={styles.adjustList} role="list" aria-label="Band adjustments">
      {adjustments.map((adj, index) => (
        <div key={`${adj.regime}-${index}`} className={styles.adjustRow} role="listitem">
          <span className={styles.regimeTag}>{adj.regime}</span>
          <span className={styles.adjustWidths}>
            band {adj.oldWidth.toFixed(1)}pp &rarr; {adj.newWidth.toFixed(1)}pp
          </span>
          <span className={styles.adjustReason}>{adj.reason}</span>
          <span className={styles.adjustTime}>
            {formatUtcTimestamp(adj.timestampUtc)}
          </span>
        </div>
      ))}
    </div>
  );
}

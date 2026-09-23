'use client';

import React from 'react';
import styles from './OverviewPage.module.css';

interface DayTileData {
  day: string;
  date: string;
  status: string;
  variant: 'lime' | 'indigo' | 'well' | 'peach';
  hasCheck?: boolean;
}

const WEEKEND_TILES: DayTileData[] = [
  {
    day: 'Fri',
    date: 'Sep 25',
    status: 'Index froze',
    variant: 'lime',
    hasCheck: true,
  },
  {
    day: 'Sat',
    date: 'Sep 26',
    status: 'Market closed',
    variant: 'indigo',
  },
  {
    day: 'Sun',
    date: 'Sep 27',
    status: 'Hold continues',
    variant: 'well',
  },
  {
    day: 'Mon',
    date: 'Sep 28',
    status: 'Reopen',
    variant: 'peach',
  },
];

export default function WeekendStrip() {
  return (
    <div className={styles.weekendStrip}>
      <div className={styles.stripHeader}>
        <span className={styles.cardEyebrow}>Weekend timeline</span>
        <span className={styles.stripNoteTime}>Demo weekend · Sep 25 – 28</span>
      </div>

      <div className={styles.tilesGrid}>
        {WEEKEND_TILES.map((tile) => {
          let tileClass = styles.dayTile;
          let dotClass = styles.dayDotWell;

          if (tile.variant === 'lime') {
            tileClass = `${styles.dayTile} ${styles.dayTileLime}`;
            dotClass = styles.dayDotLime;
          } else if (tile.variant === 'indigo') {
            tileClass = `${styles.dayTile} ${styles.dayTileIndigo}`;
            dotClass = styles.dayDotIndigo;
          } else if (tile.variant === 'peach') {
            tileClass = `${styles.dayTile} ${styles.dayTilePeach}`;
            dotClass = styles.dayDotPeach;
          } else {
            tileClass = `${styles.dayTile} ${styles.dayTileWell}`;
            dotClass = styles.dayDotWell;
          }

          return (
            <div key={tile.day} className={tileClass}>
              <div className={styles.dayLabel}>
                <span>{tile.day}</span>
                {tile.hasCheck ? (
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                ) : (
                  <span className={`${styles.dayDot} ${dotClass}`} />
                )}
              </div>
              <div className={styles.dayStatus}>{tile.status}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.stripNotes}>
        <div className={styles.stripNoteRow}>
          <div className={styles.stripNoteLeft}>
            <span className={`${styles.dayDot} ${styles.dayDotLime}`} />
            <span>Desk grades itself</span>
          </div>
          <span className={styles.stripNoteTime}>Mon 09:30 UTC</span>
        </div>
        <div className={styles.stripNoteRow}>
          <div className={styles.stripNoteLeft}>
            <span className={`${styles.dayDot} ${styles.dayDotPeach}`} />
            <span>Cash market reopens</span>
          </div>
          <span className={styles.stripNoteTime}>Mon 13:30 UTC</span>
        </div>
      </div>
    </div>
  );
}

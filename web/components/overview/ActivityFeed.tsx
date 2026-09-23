'use client';

import React from 'react';
import styles from './OverviewPage.module.css';

export type ActivityIconType =
  | 'freeze'
  | 'funding'
  | 'dossier'
  | 'grade'
  | 'adjust';

export interface ActivityItem {
  icon: ActivityIconType;
  text: string;
  time: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
}

function FeedIcon({ type }: { type: ActivityIconType }) {
  switch (type) {
    case 'freeze':
      return (
        <svg
          className={styles.feedIconSvg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2v20M17 5l-5 5-5-5M17 19l-5-5-5 5M2 12h20M5 7l5 5-5 5M19 7l-5 5 5 5" />
        </svg>
      );
    case 'funding':
      return (
        <svg
          className={styles.feedIconSvg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 10h14l-4-4M17 14H3l4 4" />
        </svg>
      );
    case 'dossier':
      return (
        <svg
          className={styles.feedIconSvg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'grade':
      return (
        <svg
          className={styles.feedIconSvg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
      );
    case 'adjust':
      return (
        <svg
          className={styles.feedIconSvg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="9" cy="6" r="2" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="2" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8" cy="18" r="2" />
        </svg>
      );
  }
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <div className={styles.feedList} role="feed" aria-label="Recent desk events">
      {visibleItems.map((item, idx) => (
        <div key={`${item.time}-${idx}`} className={styles.feedItem}>
          <div className={styles.feedIconChip}>
            <FeedIcon type={item.icon} />
          </div>
          <span className={styles.feedText}>{item.text}</span>
          <span className={styles.feedTime}>{item.time}</span>
        </div>
      ))}
    </div>
  );
}

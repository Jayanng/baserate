'use client';

import React from 'react';
import Link from 'next/link';
import AppFrame from '@/components/shell/AppFrame';
import WeekendStrip from '@/components/overview/WeekendStrip';
import JourneyStepper from '@/components/overview/JourneyStepper';
import RecordDonut from '@/components/overview/RecordDonut';
import ActivityFeed, {
  type ActivityItem,
} from '@/components/overview/ActivityFeed';
import {
  getReplayStats,
  getReplayCalibration,
  getReplayGaps,
} from '@/src/data/replay-fixtures';
import {
  computeLiquidationDistance,
  computeFundingCarry,
  computeWorstGap,
} from '@/src/engine/risk-engine';
import {
  FIXTURE_SPOT_PRICE,
  FIXTURE_FUNDING_RATE,
} from '@/components/dossier/fixtures';
import styles from '@/components/overview/OverviewPage.module.css';

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    icon: 'freeze',
    text: 'Bitget rToken index froze at Friday close (20:00 UTC)',
    time: 'Fri 20:00 UTC',
  },
  {
    icon: 'funding',
    text: `Funding settled at +${(FIXTURE_FUNDING_RATE * 100).toFixed(3)}% for 8h interval carry`,
    time: 'Sat 08:00 UTC',
  },
  {
    icon: 'dossier',
    text: 'Dossier issued for rNVDA 3x weekend hold (5,000 USDT margin)',
    time: 'Fri 20:15 UTC',
  },
  {
    icon: 'grade',
    text: 'Replay forecast evaluation demonstrated at cash-market reopen',
    time: 'replayed',
  },
  {
    icon: 'adjust',
    text: 'Band adjustment rule armed: regimes below 70% across 5+ forecasts auto-widen',
    time: 'standing rule',
  },
];

export default function OverviewPage() {
  // Desk-reference dataset: rNVDA (represents the desk's registered baseline record)
  const stats = getReplayStats('rNVDA');
  const calibration = getReplayCalibration('rNVDA');
  const gaps = getReplayGaps('rNVDA');

  // Deterministic risk calculations computed at render
  const liquidationDistancePct = computeLiquidationDistance(
    FIXTURE_SPOT_PRICE,
    3,
    'long'
  );
  const liquidationDistanceStr = `${liquidationDistancePct.toFixed(1)}%`;
  const liquidationPrice = (
    FIXTURE_SPOT_PRICE * (1 + liquidationDistancePct / 100)
  ).toFixed(2);

  const fundingCarryPct = computeFundingCarry(FIXTURE_FUNDING_RATE, 60);
  const fundingCarryStr = `+${fundingCarryPct.toFixed(2)}%`;
  const intervalFundingPct = (FIXTURE_FUNDING_RATE * 100).toFixed(3);

  const worstGap = computeWorstGap(gaps);
  const worstGapStr =
    worstGap !== null ? `${worstGap.toFixed(1)}%` : '-18.5%';
  const worstDateFormatted = new Date(`${stats.worstDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <AppFrame>
      <main className={styles.content}>
        {/* 1. Page Header */}
        <header className={styles.pageHeader}>
          <div className={styles.headerTextGroup}>
            <h1 className={styles.pageTitle}>Weekend Desk</h1>
            <p className={styles.pageSubtitle}>
              Demo weekend: Saturday, September 26, 2026 - markets closed, positions holding
            </p>
          </div>
          <div className={styles.statusPill} role="status">
            <span className={styles.statusDotLive} aria-hidden="true" />
            <span>Replay mode · 12 graded weekends</span>
          </div>
        </header>

        {/* 2. Bento Hero Grid: Exposure Hero (Left) + Weekend Timeline Strip (Right) */}
        <section className={styles.heroGrid} aria-label="Weekend exposure summary">
          {/* Left: Exposure Card */}
          <div className={styles.exposureCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardEyebrow}>
                Weekend survival probability
              </span>
              <span className={styles.positionPill}>rNVDA · Long · 3x</span>
            </div>

            <div className={styles.survivalBlock}>
              <div className={styles.survivalNumberRow}>
                <span className={styles.survivalHero}>{stats.survivedWorstGapPct}%</span>
                <span className={styles.survivalBadge}>
                  <span
                    className={styles.survivalBadgeDot}
                    aria-hidden="true"
                  />
                  survived {stats.survivedWorstGapCount} of {stats.totalEpisodes} comparable weekends
                </span>
              </div>
              <p className={styles.survivalContext}>
                5,000 USDT margin · held from Friday cash close to Monday reopen
              </p>
            </div>

            {/* Stepper: Current stage is 3 (Weekend hold) */}
            <div className={styles.journeyRow}>
              <JourneyStepper currentStage={3} />
            </div>
          </div>

          {/* Right: Weekend Strip */}
          <WeekendStrip />
        </section>

        {/* 3. Compact Metrics Row: 3 Stat Tiles */}
        <section className={styles.metricsRow} aria-label="Key risk metrics">
          <div className={styles.metricTile}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Liquidation line</span>
              <span className={`${styles.evidenceTag} ${styles.tagComputed}`}>
                Computed
              </span>
            </div>
            <div className={`${styles.metricValue} ${styles.metricValueCoral}`}>
              {liquidationDistanceStr}
            </div>
            <span className={styles.metricSubtext}>
              rNVDA liquidation price ${liquidationPrice}
            </span>
          </div>

          <div className={styles.metricTile}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Funding carry</span>
              <span className={`${styles.evidenceTag} ${styles.tagEstimated}`}>
                Estimated
              </span>
            </div>
            <div className={`${styles.metricValue} ${styles.metricValueInk}`}>
              {fundingCarryStr}
            </div>
            <span className={styles.metricSubtext}>
              Across 60h hold at +{intervalFundingPct}% / 8h interval
            </span>
          </div>

          <div className={styles.metricTile}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Worst gap on record</span>
              <span className={`${styles.evidenceTag} ${styles.tagObserved}`}>
                Observed
              </span>
            </div>
            <div className={`${styles.metricValue} ${styles.metricValueInk}`}>
              {worstGapStr}
            </div>
            <span className={styles.metricSubtext}>
              {worstDateFormatted} Covid crash acceleration
            </span>
          </div>
        </section>

        {/* 4. Action Grid: Two Link Cards */}
        <section className={styles.actionGrid} aria-label="Quick actions">
          <Link href="/dossier" className={styles.actionCard}>
            <div className={styles.actionContent}>
              <h2 className={styles.actionTitle}>Review the dossier</h2>
              <p className={styles.actionDescription}>
                Inspect deterministic liquidation distance, native gap
                distribution, and live counterfactuals.
              </p>
            </div>
            <div className={styles.actionArrow} aria-hidden="true">
              <svg
                className={styles.actionArrowIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>

          <Link href="/scorecard" className={styles.actionCard}>
            <div className={styles.actionContent}>
              <h2 className={styles.actionTitle}>See the scorecard</h2>
              <p className={styles.actionDescription}>
                Verify calibration ledger, deterministic band adjustments, and
                historical replay records.
              </p>
            </div>
            <div className={styles.actionArrow} aria-hidden="true">
              <svg
                className={styles.actionArrowIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>
        </section>

        {/* 5 & 6. Bottom Bento Grid: Forecast Record Donut + Activity Feed */}
        <section
          className={styles.bottomGrid}
          aria-label="Forecast record and activity"
        >
          {/* 5. Record Donut Card */}
          <div className={styles.recordCard}>
            <div className={styles.cardHeaderAction}>
              <h2 className={styles.cardTitle}>Forecast record</h2>
              <Link href="/scorecard" className={styles.cardLinkHeader}>
                View full scorecard &rarr;
              </Link>
            </div>
            <RecordDonut
              hits={calibration.hits}
              misses={calibration.misses}
              pending={calibration.pending}
            />
            <p className={styles.recordFootnote}>
              Cryptographic forecast ledger graded against real market outcomes in replay mode.
              Misses stay visible.
            </p>
          </div>

          {/* 6. Feed Card */}
          <div className={styles.feedCard}>
            <div className={styles.cardHeaderAction}>
              <h2 className={styles.cardTitle}>Desk activity</h2>
              <span className={styles.cardEyebrow}>Desk feed</span>
            </div>
            <ActivityFeed items={ACTIVITY_ITEMS} />
            <Link href="/dossier" className={styles.linkRow}>
              <span>Open full dossier</span>
              <svg
                className={styles.linkRowArrow}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="8" x2="13" y2="8" />
                <polyline points="8 3 13 8 8 13" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </AppFrame>
  );
}

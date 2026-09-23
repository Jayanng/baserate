'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import AppFrame from '@/components/shell/AppFrame';
import RegimeTable from '@/components/scorecard/RegimeTable';
import AdjustmentLog from '@/components/scorecard/AdjustmentLog';
import LedgerTable from '@/components/scorecard/LedgerTable';
import {
  FIXTURE_FORECAST_RECORDS,
  FIXTURE_BAND_ADJUSTMENTS,
} from '@/components/scorecard/fixtures';
import { computeCalibration } from '@/src/scorekeeper/calibration';
import { appendToLedger, type LedgerEntry } from '@/src/scorekeeper/ledger';
import styles from '@/components/scorecard/ScorecardPage.module.css';

export default function ScorecardPage() {
  const records = FIXTURE_FORECAST_RECORDS;
  const adjustments = FIXTURE_BAND_ADJUSTMENTS;

  // 1. Deterministic Calibration calculation
  const calibration = useMemo(() => {
    return computeCalibration(records);
  }, [records]);

  // 2. Cryptographic hash-chained ledger build
  const ledgerEntries = useMemo(() => {
    let chain: LedgerEntry[] = [];
    for (const r of records) {
      chain = appendToLedger(chain, r.id, r.status);
    }
    return chain;
  }, [records]);

  // Graded calculations from real calibration
  const gradedCount = calibration.hits + calibration.misses;
  const calibrationRatePct =
    gradedCount > 0 ? Math.round((calibration.hits / gradedCount) * 100) : 0;

  return (
    <AppFrame>
      <main className={styles.content}>
        {/* 1. Page Header & Single Replay Pill */}
        <header className={styles.pageHeader}>
          <div className={styles.headerTextGroup}>
            <h1 className={styles.pageTitle}>Scorecard</h1>
            <p className={styles.pageSubtitle}>
              Every dossier is a registered forecast. Every Monday, the desk grades itself.
            </p>
          </div>
          {/* Exactly one replay pill in header area */}
          <div className={styles.replayPill} role="status" aria-label="Replay mode status">
            <svg
              className={styles.replayIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Replay mode &middot; {records.length} weekends</span>
          </div>
        </header>

        {/* 2. Hero Grid: Calibration Hero (Left) + Record Summary (Right) */}
        <section className={styles.heroGrid} aria-label="Calibration overview">
          {/* Left: Calibration Hero Card */}
          <div className={styles.heroCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardEyebrow}>Calibration rate</span>
            </div>

            <div className={styles.heroMain}>
              <div className={styles.heroNumberRow}>
                <span className={styles.heroNumber}>{calibrationRatePct}%</span>
                <div className={styles.heroTextGroup}>
                  <h2 className={styles.heroTitle}>of issued bands contained reality</h2>
                  <p className={styles.heroSubtext}>
                    {calibration.hits} of {gradedCount} graded forecasts landed inside the predicted band
                  </p>
                  <p className={styles.heroCaveat}>
                    Sample: {gradedCount} weekend forecasts, replay mode
                  </p>
                </div>
              </div>
            </div>

            {/* Replay mode notice under hero */}
            <div className={styles.heroReplayNotice}>
              <span className={styles.noticeDot} aria-hidden="true" />
              <span>
                Replay mode: {records.length} historical weekends reconstructed from native market data. Not live trading. Reference dataset: rNVDA.
              </span>
            </div>
          </div>

          {/* Right: Record Summary Card */}
          <div className={styles.summaryCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardEyebrow}>Forecast outcomes</span>
            </div>

            <div className={styles.summaryTiles}>
              <div className={styles.summaryTile}>
                <span
                  className={styles.summaryTileNumber}
                  style={{ color: 'var(--br-lime-ink)' }}
                >
                  {calibration.hits}
                </span>
                <span className={styles.summaryTileLabel}>Hits</span>
              </div>
              <div className={styles.summaryTile}>
                <span
                  className={styles.summaryTileNumber}
                  style={{ color: 'var(--br-coral-bright)' }}
                >
                  {calibration.misses}
                </span>
                <span className={styles.summaryTileLabel}>Misses</span>
              </div>
              <div className={styles.summaryTile}>
                <span
                  className={styles.summaryTileNumber}
                  style={{ color: 'var(--br-peach-ink)' }}
                >
                  {calibration.pending}
                </span>
                <span className={styles.summaryTileLabel}>Pending</span>
              </div>
            </div>

            <div className={styles.quickNavGroup}>
              <Link href="/overview" className={styles.quickNavLink}>
                <svg
                  className={styles.quickNavArrow}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Overview</span>
              </Link>
              <Link href="/dossier" className={styles.quickNavLink}>
                <span>Inspect Dossier</span>
                <svg
                  className={styles.quickNavArrow}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Per-Regime Table Card */}
        <section className={styles.regimeCard} aria-label="Per-regime accuracy">
          <div className={styles.sectionHeaderGroup}>
            <span className={styles.cardEyebrow}>Per-regime accuracy</span>
            <h2 className={styles.sectionTitle}>Regime Reliability Breakdown</h2>
            <p className={styles.sectionSubtitle}>
              Sample size threshold: minimum 5 graded forecasts required before a regime is graded Reliable.
            </p>
          </div>
          <RegimeTable byRegime={calibration.byRegime} records={records} />
        </section>

        {/* 4. Band Adjustment Log Card */}
        <section className={styles.adjustCard} aria-label="Band adjustments">
          <div className={styles.sectionHeaderGroup}>
            <span className={styles.cardEyebrow}>Band adjustments</span>
            <h2 className={styles.sectionTitle}>Deterministic Widening Log</h2>
            <p className={styles.sectionSubtitle}>
              When a regime drops below 70% accuracy across 5+ forecasts, band width widens automatically by 0.5pp per miss.
            </p>
          </div>
          <AdjustmentLog adjustments={adjustments} />
        </section>

        {/* 5. Forecast Ledger Card */}
        <section className={styles.ledgerCard} aria-label="Forecast ledger">
          <div className={styles.sectionHeaderGroup}>
            <span className={styles.cardEyebrow}>Forecast ledger</span>
            <h2 className={styles.sectionTitle}>Cryptographic Forecast Registry</h2>
            <p className={styles.sectionSubtitle}>
              Immutable hash-chained log of all registered forecasts and their graded outcomes.
            </p>
          </div>
          <LedgerTable entries={ledgerEntries} forecasts={records} />
        </section>
      </main>
    </AppFrame>
  );
}

'use client';

import React from 'react';
import {
  type CalibrationRegime,
  type CalibrationStatus,
  type ForecastRecord,
  type RegimeTag,
} from '@/src/domain/types';
import styles from './ScorecardPage.module.css';

export interface RegimeTableProps {
  byRegime: CalibrationRegime[];
  records?: ForecastRecord[];
}

function formatRegimeName(regime: RegimeTag): string {
  switch (regime) {
    case 'trend_up':
      return 'Trend-up';
    case 'trend_down':
      return 'Trend-down';
    case 'chop':
      return 'Chop';
    case 'capitulation':
      return 'Capitulation';
    case 'squeeze':
      return 'Squeeze';
    case 'insufficient_evidence':
      return 'Insufficient evidence';
    default:
      return regime;
  }
}

function getRegimeDotClass(regime: RegimeTag): string {
  switch (regime) {
    case 'trend_up':
      return styles.regimeDotTrendUp;
    case 'chop':
      return styles.regimeDotChop;
    case 'squeeze':
      return styles.regimeDotSqueeze;
    case 'capitulation':
      return styles.regimeDotCapitulation;
    default:
      return styles.regimeDotDefault;
  }
}

function getStatusBadge(status: CalibrationStatus) {
  switch (status) {
    case 'reliable':
      return (
        <span className={`${styles.statusCell} ${styles.statusReliable}`}>
          Reliable
        </span>
      );
    case 'provisional':
      return (
        <span className={`${styles.statusCell} ${styles.statusProvisional}`}>
          Provisional
        </span>
      );
    case 'adjusted':
      return (
        <span className={`${styles.statusCell} ${styles.statusAdjusted}`}>
          Adjusted
        </span>
      );
  }
}

export default function RegimeTable({ byRegime, records }: RegimeTableProps) {
  // Sort rows: adjusted first, then provisional, then reliable
  const statusOrder: Record<CalibrationStatus, number> = {
    adjusted: 0,
    provisional: 1,
    reliable: 2,
  };

  const sortedRegimes = [...byRegime].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table} aria-label="Per-regime forecast accuracy">
        <thead>
          <tr>
            <th className={styles.tableTh} scope="col">
              Regime
            </th>
            <th className={`${styles.tableTh} ${styles.tableThRight}`} scope="col">
              Graded
            </th>
            <th className={styles.tableTh} scope="col">
              Inside band
            </th>
            <th className={`${styles.tableTh} ${styles.tableThRight}`} scope="col">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRegimes.map((reg) => {
            // Compute graded count and pending count if records provided
            let gradedCount = reg.total;
            let pendingCount = 0;

            if (records && records.length > 0) {
              const regimeRecords = records.filter((r) => r.regime === reg.regime);
              gradedCount = regimeRecords.filter((r) => r.status !== 'pending').length;
              pendingCount = regimeRecords.filter((r) => r.status === 'pending').length;
            }

            const hitCount = reg.hits;
            const accuracyPct =
              gradedCount > 0 ? Math.round((hitCount / gradedCount) * 100) : null;

            // Accuracy bar color
            const barFillClass =
              accuracyPct === null
                ? styles.accuracyBarFillMuted
                : accuracyPct >= 70
                ? styles.accuracyBarFillLime
                : styles.accuracyBarFillCoral;

            return (
              <tr key={reg.regime} className={styles.tableRow}>
                {/* 1. Regime (dot + name) */}
                <td className={styles.tableTd}>
                  <div className={styles.regimeNameCell}>
                    <span
                      className={`${styles.regimeDot} ${getRegimeDotClass(reg.regime)}`}
                      aria-hidden="true"
                    />
                    <span>{formatRegimeName(reg.regime)}</span>
                  </div>
                </td>

                {/* 2. Graded count */}
                <td className={`${styles.tableTd} ${styles.tableTdRight}`}>
                  <span className={styles.tabularNum}>
                    {gradedCount}
                    {pendingCount > 0 && (
                      <span style={{ color: 'var(--br-text-faint)', fontSize: 'var(--br-font-size-xs)' }}>
                        {' '}({pendingCount} pend.)
                      </span>
                    )}
                  </span>
                </td>

                {/* 3. Inside band (hits/total + accuracyBar) */}
                <td className={styles.tableTd}>
                  <div className={styles.accuracyCell}>
                    <span className={styles.accuracyText}>
                      {gradedCount > 0 ? (
                        <>
                          {hitCount} of {gradedCount} ({accuracyPct}%)
                        </>
                      ) : (
                        <span style={{ color: 'var(--br-text-faint)' }}>
                          Pending grade
                        </span>
                      )}
                    </span>
                    <div
                      className={styles.accuracyBar}
                      role="progressbar"
                      aria-valuenow={accuracyPct ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${formatRegimeName(reg.regime)} accuracy`}
                    >
                      <div
                        className={barFillClass}
                        style={{ width: `${accuracyPct ?? 0}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* 4. Status pill */}
                <td className={`${styles.tableTd} ${styles.tableTdRight}`}>
                  {getStatusBadge(reg.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

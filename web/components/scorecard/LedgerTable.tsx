'use client';

import React from 'react';
import { type LedgerEntry, verifyLedgerIntegrity } from '@/src/scorekeeper/ledger';
import { type ForecastRecord } from '@/src/domain/types';
import styles from './ScorecardPage.module.css';

export interface LedgerTableProps {
  entries: LedgerEntry[];
  forecasts: ForecastRecord[];
}

function formatUtcDate(isoStr: string): string {
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
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  } catch {
    return isoStr;
  }
}

function formatBand(low?: number, high?: number): string {
  if (low === undefined || high === undefined) return '—';
  const lowStr = (low >= 0 ? '+' : '') + low.toFixed(1) + '%';
  const highStr = (high >= 0 ? '+' : '') + high.toFixed(1) + '%';
  return `${lowStr} to ${highStr}`;
}

export default function LedgerTable({ entries, forecasts }: LedgerTableProps) {
  const isVerified = verifyLedgerIntegrity(entries);

  // Map forecasts by id for fast join
  const forecastMap = new Map<string, ForecastRecord>();
  for (const f of forecasts) {
    forecastMap.set(f.id, f);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--br-space-4)' }}>
      {/* Verification Row */}
      <div className={styles.verifyRow} role="status">
        <div className={styles.verifyLeft}>
          <svg
            className={styles.verifyIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>
            {isVerified
              ? 'Ledger integrity: verified'
              : 'Ledger integrity: verification failed'}
          </span>
        </div>
        <div className={styles.verifyCount}>
          {entries.length} chained entries verified from GENESIS
        </div>
      </div>

      {/* Scrollable table container */}
      <div className={styles.ledgerScroll}>
        <table className={styles.ledgerTable} aria-label="Cryptographic forecast ledger">
          <thead>
            <tr>
              <th className={styles.ledgerTh} scope="col">
                ID
              </th>
              <th className={styles.ledgerTh} scope="col">
                Issued
              </th>
              <th className={styles.ledgerTh} scope="col">
                Band
              </th>
              <th className={styles.ledgerTh} scope="col">
                Regime
              </th>
              <th className={styles.ledgerTh} scope="col">
                Status
              </th>
              <th className={styles.ledgerTh} scope="col">
                Hash
              </th>
              <th className={styles.ledgerTh} scope="col">
                Mode
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const forecast = forecastMap.get(entry.forecastId);
              const mode = forecast?.mode ?? 'replay';
              const regime = forecast?.regime ?? 'chop';
              const issuedDate = forecast?.issuedAtUtc
                ? formatUtcDate(forecast.issuedAtUtc)
                : '—';
              const bandText = formatBand(forecast?.bandLowPct, forecast?.bandHighPct);

              return (
                <tr key={entry.entryHash} className={styles.ledgerRow}>
                  {/* 1. ID (mono, truncated 8 chars) */}
                  <td className={styles.ledgerTd}>
                    <span className={styles.monoId}>
                      {entry.forecastId.slice(0, 8)}
                    </span>
                  </td>

                  {/* 2. Issued (date) */}
                  <td className={styles.ledgerTd}>
                    <span className={styles.tabularNum}>{issuedDate}</span>
                  </td>

                  {/* 3. Band (low..high tabular) */}
                  <td className={styles.ledgerTd}>
                    <span className={styles.tabularNum}>{bandText}</span>
                  </td>

                  {/* 4. Regime (lavender dot + text) */}
                  <td className={styles.ledgerTd}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--br-space-2)' }}>
                      <span
                        className={`${styles.regimeDot} ${styles.regimeDotChop}`}
                        aria-hidden="true"
                      />
                      <span>{regime}</span>
                    </div>
                  </td>

                  {/* 5. Status (lime check / coral x / peach clock line icons) */}
                  <td className={styles.ledgerTd}>
                    {entry.grade === 'hit' && (
                      <span className={`${styles.statusIconGroup} ${styles.statusHit}`}>
                        <svg
                          className={styles.statusSvg}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="9 12 11 14 15 10" />
                        </svg>
                        <span>Hit</span>
                      </span>
                    )}
                    {entry.grade === 'miss' && (
                      <span className={`${styles.statusIconGroup} ${styles.statusMiss}`}>
                        <svg
                          className={styles.statusSvg}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>Miss</span>
                      </span>
                    )}
                    {entry.grade === 'pending' && (
                      <span className={`${styles.statusIconGroup} ${styles.statusPending}`}>
                        <svg
                          className={styles.statusSvg}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Pending</span>
                      </span>
                    )}
                  </td>

                  {/* 6. Hash (mono faint) */}
                  <td className={styles.ledgerTd}>
                    <span className={styles.monoHash} title={entry.entryHash}>
                      {entry.entryHash.slice(0, 8)}
                    </span>
                  </td>

                  {/* 7. Mode (replay=peach dot, live=lime dot) */}
                  <td className={styles.ledgerTd}>
                    <div className={styles.modeDotGroup}>
                      <span
                        className={
                          mode === 'live' ? styles.modeDotLive : styles.modeDotReplay
                        }
                        aria-hidden="true"
                      />
                      <span>{mode}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

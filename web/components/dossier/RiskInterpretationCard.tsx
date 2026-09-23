import React from 'react';
import type { RiskInterpretation } from '@/src/domain/types';
import styles from './DossierPage.module.css';

interface RiskInterpretationCardProps {
  interpretation: RiskInterpretation;
}

export default function RiskInterpretationCard({
  interpretation,
}: RiskInterpretationCardProps) {
  const isBreached = interpretation.code === 'HISTORY_BREACHED_LIQUIDATION';
  const isIncomplete = interpretation.code === 'INCOMPLETE_EVIDENCE';

  const cardBorderClass = isBreached
    ? styles.interpretationCardBreached
    : isIncomplete
      ? styles.interpretationCardIncomplete
      : styles.interpretationCardWithin;

  const liqVal = interpretation.inputs.liquidationDistancePct;
  const worstVal = interpretation.inputs.worstGapPct;
  const rateVal = interpretation.inputs.gapThroughLiquidationRate;
  const sampleVal = interpretation.inputs.sampleSize;
  const carryVal = interpretation.inputs.fundingCarryPct;

  return (
    <div
      className={`${styles.interpretationCard} ${cardBorderClass}`}
      data-testid="risk-interpretation-card"
    >
      <div className={styles.interpretationHeader}>
        <span className={styles.interpretationBadgeTitle}>
          Deterministic interpretation
        </span>
        <span className={`${styles.evidenceTag} ${styles.tagComputed}`}>
          computed
        </span>
      </div>

      <p className={styles.interpretationHeadline}>
        {interpretation.headline}
      </p>
      <p className={styles.interpretationSummary}>
        {interpretation.summary}
      </p>

      {/* HOW details disclosure */}
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
            <span className={styles.metricHowKey}>liquidation distance:</span>{' '}
            <span className={styles.metricHowVal}>
              {liqVal !== null
                ? `${liqVal > 0 ? '+' : ''}${liqVal.toFixed(1)}%`
                : 'unavailable'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>worst historical gap:</span>{' '}
            <span className={styles.metricHowVal}>
              {worstVal !== null
                ? `${worstVal > 0 ? '+' : ''}${worstVal.toFixed(1)}%`
                : 'unavailable'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>gap-through rate:</span>{' '}
            <span className={styles.metricHowVal}>
              {rateVal !== null
                ? rateVal === 0
                  ? '0.0%'
                  : rateVal <= 1
                    ? `${(rateVal * 100).toFixed(1)}%`
                    : `${rateVal.toFixed(1)}%`
                : 'unavailable'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>sample size:</span>{' '}
            <span className={styles.metricHowVal}>
              {sampleVal !== null
                ? `${sampleVal.toLocaleString()} episodes`
                : 'unavailable'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>funding carry:</span>{' '}
            <span className={styles.metricHowVal}>
              {carryVal !== null
                ? `${carryVal > 0 ? '+' : ''}${carryVal.toFixed(2)}%`
                : 'unavailable'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>rule:</span>{' '}
            <span className={styles.metricHowVal}>
              Historical gap distribution vs liquidation distance threshold
            </span>
          </div>
          <div className={styles.metricHowDivider} />
          <div className={`${styles.metricHowRow} ${styles.metricHowResultRow}`}>
            <span className={styles.metricHowKey}>result:</span>{' '}
            <span className={styles.metricHowResultVal}>
              {interpretation.code}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}

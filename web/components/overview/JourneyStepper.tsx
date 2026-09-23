'use client';

import React from 'react';
import styles from './OverviewPage.module.css';

export interface JourneyStepperProps {
  currentStage: number;
}

const STAGES = [
  'Fri close',
  'Index froze',
  'Position filled',
  'Weekend hold',
  'Mon reopen',
];

export default function JourneyStepper({ currentStage }: JourneyStepperProps) {
  return (
    <div
      className={styles.stepperContainer}
      role="group"
      aria-label="Weekend holding progress stepper"
    >
      <div className={styles.stepperHairline} aria-hidden="true" />
      {STAGES.map((label, idx) => {
        const isDone = idx < currentStage;
        const isCurrent = idx === currentStage;
        const isFuture = idx > currentStage;

        let dotClass = styles.stepDotFuture;
        let labelClass = styles.stepLabelFuture;

        if (isDone) {
          dotClass = `${styles.stepDot} ${styles.stepDotDone}`;
          labelClass = `${styles.stepLabel} ${styles.stepLabelDone}`;
        } else if (isCurrent) {
          dotClass = `${styles.stepDot} ${styles.stepDotCurrent}`;
          labelClass = `${styles.stepLabel} ${styles.stepLabelCurrent}`;
        } else {
          dotClass = `${styles.stepDot} ${styles.stepDotFuture}`;
          labelClass = `${styles.stepLabel} ${styles.stepLabelFuture}`;
        }

        return (
          <div key={label} className={styles.stepItem}>
            <div className={dotClass} aria-hidden="true">
              {isDone && (
                <svg
                  className={styles.stepCheckIcon}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              )}
              {isCurrent && <span className={styles.stepDotCurrentInner} />}
            </div>
            <span className={labelClass}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

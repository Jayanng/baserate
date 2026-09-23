'use client';

import React from 'react';
import styles from './DossierPage.module.css';
import {
  computeCounterfactualDelta,
  formatLiquidationDistance,
  PRESET_STRESS_LEVERAGE,
  MAX_LEVERAGE_ALLOWED,
  MIN_LEVERAGE_STRESS,
} from './counterfactual-math';

interface CounterfactualControlsProps {
  sizeUsdt: number;
  leverage: number;
  onRecompute: (sizeUsdt: number, leverage: number) => void;
  liquidationDistancePct?: number | null;
  worstGapPct?: number | null;
  originalSizeUsdt?: number;
  originalLeverage?: number;
  originalLiquidationDistancePct?: number | null;
  direction?: 'long' | 'short';
}

export default function CounterfactualControls({
  sizeUsdt,
  leverage,
  onRecompute,
  liquidationDistancePct,
  worstGapPct,
  originalSizeUsdt,
  originalLeverage,
  originalLiquidationDistancePct,
}: CounterfactualControlsProps) {
  const origLeverage = originalLeverage ?? leverage;
  const origLiqDistance =
    originalLiquidationDistancePct !== undefined
      ? originalLiquidationDistancePct
      : liquidationDistancePct;

  const deltaResult = computeCounterfactualDelta({
    originalLeverage: origLeverage,
    originalLiquidationDistancePct: origLiqDistance,
    currentLeverage: leverage,
    currentLiquidationDistancePct: liquidationDistancePct,
  });

  let survivalNote = 'Deterministic Bitget margin calculation';

  if (leverage > MAX_LEVERAGE_ALLOWED) {
    survivalNote = `Refusal: leverage exceeds maximum allowed limit (${MAX_LEVERAGE_ALLOWED}x)`;
  } else if (leverage <= MIN_LEVERAGE_STRESS) {
    survivalNote = 'Unleveraged position (no liquidation risk)';
  } else if (
    liquidationDistancePct !== null &&
    liquidationDistancePct !== undefined &&
    worstGapPct !== null &&
    worstGapPct !== undefined
  ) {
    const liqAbs = Math.abs(liquidationDistancePct);
    const gapAbs = Math.abs(worstGapPct);
    if (liqAbs >= gapAbs) {
      const diff = (liqAbs - gapAbs).toFixed(1);
      survivalNote = `Survives worst historical gap by ${diff} percentage points`;
    } else {
      const diff = (gapAbs - liqAbs).toFixed(1);
      survivalNote = `Vulnerable: liquidation line exceeds buffer by ${diff} percentage points`;
    }
  }

  const isStress10xActive = leverage === PRESET_STRESS_LEVERAGE;

  return (
    <div className={styles.counterfactualSection}>
      <div className={styles.cfHeaderRow}>
        <h3 className={styles.cardTitle}>Live counterfactuals</h3>
        <div className={styles.presetActions}>
          <button
            type="button"
            className={`${styles.presetButton} ${
              isStress10xActive ? styles.presetButtonActive : ''
            }`.trim()}
            onClick={() => onRecompute(sizeUsdt, PRESET_STRESS_LEVERAGE)}
            aria-pressed={isStress10xActive}
            aria-label="Stress at 10x leverage"
          >
            Stress at 10x
          </button>
        </div>
      </div>

      {/* Slider 1: Position size */}
      <div className={styles.sliderGroup}>
        <label className={styles.sliderLabel} htmlFor="slider-size">
          Position size
        </label>
        <input
          id="slider-size"
          type="range"
          min="1000"
          max="50000"
          step="500"
          value={sizeUsdt}
          onChange={(e) => onRecompute(Number(e.target.value), leverage)}
          className={styles.sliderInput}
        />
        <span className={styles.sliderValue}>{sizeUsdt.toLocaleString()} USDT</span>
      </div>

      {/* Slider 2: Leverage */}
      <div className={styles.sliderGroup}>
        <label className={styles.sliderLabel} htmlFor="slider-leverage">
          Leverage
        </label>
        <input
          id="slider-leverage"
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={Math.min(leverage, 10)}
          onChange={(e) => onRecompute(sizeUsdt, Number(e.target.value))}
          className={styles.sliderInput}
        />
        <span className={styles.sliderValue}>{leverage.toFixed(1)}x</span>
      </div>

      {/* Compact Before / Current Delta Panel (Task 5.1) */}
      <div className={styles.cfDeltaPanel} data-testid="counterfactual-delta">
        <div className={styles.cfDeltaHeader}>
          <span className={styles.cfDeltaTitle}>Decision transformation</span>
          <span
            className={
              deltaResult.isUnchanged
                ? styles.cfDeltaBadgeMuted
                : styles.cfDeltaBadge
            }
          >
            {deltaResult.isUnchanged ? 'Baseline' : 'Counterfactual delta'}
          </span>
        </div>

        <div className={styles.cfDeltaGrid}>
          <div className={styles.cfDeltaCol}>
            <span className={styles.cfDeltaLabel}>Original dossier</span>
            <div className={styles.cfDeltaValues}>
              <span className={styles.cfDeltaPrimary}>
                {origLeverage.toFixed(1)}x
              </span>
              <span className={styles.cfDeltaSecondary}>
                {formatLiquidationDistance(origLiqDistance, origLeverage)}
              </span>
            </div>
          </div>

          <div className={styles.cfDeltaDivider} aria-hidden="true">
            →
          </div>

          <div className={styles.cfDeltaCol}>
            <span className={styles.cfDeltaLabel}>Current counterfactual</span>
            <div className={styles.cfDeltaValues}>
              <span className={styles.cfDeltaPrimary}>
                {leverage.toFixed(1)}x
              </span>
              <span className={styles.cfDeltaSecondary}>
                {formatLiquidationDistance(liquidationDistancePct, leverage)}
              </span>
            </div>
          </div>

          <div className={styles.cfDeltaDivider} aria-hidden="true">
            =
          </div>

          <div className={styles.cfDeltaCol}>
            <span className={styles.cfDeltaLabel}>Liquidation line delta</span>
            <div className={styles.cfDeltaValues}>
              <span className={styles.cfDeltaHighlight}>
                {deltaResult.deltaFormatted}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.cfInterpretation}>
          {deltaResult.interpretation}
        </div>
      </div>

      {/* Result readout box */}
      <div className={styles.cfResult}>
        <div className={styles.cfResultLeft}>
          <div>Liquidation distance at current size</div>
          <span className={styles.cfResultSub}>{survivalNote}</span>
        </div>
        <div className={styles.cfResultRight}>
          {liquidationDistancePct !== null &&
          liquidationDistancePct !== undefined &&
          leverage > 1 &&
          leverage <= MAX_LEVERAGE_ALLOWED
            ? `${liquidationDistancePct > 0 ? '+' : ''}${liquidationDistancePct.toFixed(1)}%`
            : leverage <= 1
            ? 'NONE'
            : 'UNAVAILABLE'}
        </div>
      </div>
    </div>
  );
}

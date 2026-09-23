'use client';

import React from 'react';
import styles from './DossierPage.module.css';

interface CounterfactualControlsProps {
  sizeUsdt: number;
  leverage: number;
  onRecompute: (sizeUsdt: number, leverage: number) => void;
  liquidationDistancePct?: number | null;
  worstGapPct?: number | null;
}

export default function CounterfactualControls({
  sizeUsdt,
  leverage,
  onRecompute,
  liquidationDistancePct,
  worstGapPct,
}: CounterfactualControlsProps) {
  let survivalNote = 'Deterministic Bitget margin calculation';

  if (
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
  } else if (leverage <= 1) {
    survivalNote = 'Unleveraged position (no liquidation risk)';
  }

  return (
    <div className={styles.counterfactualSection}>
      <h3 className={styles.cardTitle}>Live counterfactuals</h3>

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
          value={leverage}
          onChange={(e) => onRecompute(sizeUsdt, Number(e.target.value))}
          className={styles.sliderInput}
        />
        <span className={styles.sliderValue}>{leverage.toFixed(1)}x</span>
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
          leverage > 1
            ? `${liquidationDistancePct > 0 ? '+' : ''}${liquidationDistancePct.toFixed(1)}%`
            : leverage <= 1
            ? 'NONE'
            : 'UNAVAILABLE'}
        </div>
      </div>
    </div>
  );
}

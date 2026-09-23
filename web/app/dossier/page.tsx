'use client';

import React, { useState, useEffect } from 'react';
import AppFrame from '@/components/shell/AppFrame';
import TradeIntake from '@/components/dossier/TradeIntake';
import RiskMetrics from '@/components/dossier/RiskMetrics';
import DistributionChart from '@/components/dossier/DistributionChart';
import CounterfactualControls from '@/components/dossier/CounterfactualControls';
import EvidenceTable from '@/components/dossier/EvidenceTable';
import { parseTradeIntent } from '@/src/domain/trade-parser';
import {
  buildDossier,
  DEFAULT_WEEKEND_HOLDING_HOURS,
} from '@/src/engine/dossier-builder';
import {
  computeLiquidationDistance,
  computeFundingCarry,
} from '@/src/engine/risk-engine';
import type {
  Dossier,
  DossierRisks,
  ParsedTrade,
  RefusalState,
} from '@/src/domain/types';
import {
  getFixtureBundle,
  asReplayAsset,
  type ReplayAsset,
} from '@/components/dossier/fixtures';
import styles from '@/components/dossier/DossierPage.module.css';

const DEFAULT_TRADE_INTENT =
  'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.';

export default function DossierPage() {
  const initialParse = parseTradeIntent(DEFAULT_TRADE_INTENT);
  const initialTrade = initialParse.ok ? initialParse.value : null;
  const initialAsset = initialTrade ? asReplayAsset(initialTrade.asset) : 'rNVDA';
  const initialBundle = getFixtureBundle(initialAsset);
  const initialDossier = initialTrade
    ? buildDossier({
        parsed: initialTrade,
        spotPrice: initialBundle.spotPrice,
        fundingRate: initialBundle.fundingRate,
        gaps: initialBundle.gaps,
        nativeCandles: initialBundle.candles,
      })
    : null;

  const [inputValue] = useState(DEFAULT_TRADE_INTENT);
  const [currentAsset, setCurrentAsset] = useState<ReplayAsset>(initialAsset);
  const [dossier, setDossier] = useState<Dossier | null>(initialDossier);
  const [loading, setLoading] = useState(false);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrationLoading, setNarrationLoading] = useState<boolean>(false);
  const [sizeOverride, setSizeOverride] = useState<number>(
    initialTrade?.sizeUsdt ?? 5000
  );
  const [leverageOverride, setLeverageOverride] = useState<number>(
    initialTrade?.leverage ?? 3
  );

  useEffect(() => {
    if (!dossier) {
      setNarration(null);
      setNarrationLoading(false);
      return;
    }

    let active = true;
    setNarrationLoading(true);

    fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data && data.ok && typeof data.narration === 'string') {
            setNarration(data.narration);
          } else {
            setNarration(null);
          }
        }
      })
      .catch(() => {
        if (active) {
          setNarration(null);
        }
      })
      .finally(() => {
        if (active) {
          setNarrationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dossier]);

  const handleTradeParsed = (parsed: ParsedTrade) => {
    setLoading(true);
    setSizeOverride(parsed.sizeUsdt);
    setLeverageOverride(parsed.leverage);

    const asset = asReplayAsset(parsed.asset);
    setCurrentAsset(asset);
    const bundle = getFixtureBundle(asset);

    const newDossier = buildDossier({
      parsed,
      spotPrice: bundle.spotPrice,
      fundingRate: bundle.fundingRate,
      gaps: bundle.gaps,
      nativeCandles: bundle.candles,
    });
    setDossier(newDossier);
    setLoading(false);
  };

  const handleTradeError = (_error: RefusalState) => {
    setDossier(null);
  };

  const handleCounterfactualRecompute = (
    newSize: number,
    newLeverage: number
  ) => {
    setSizeOverride(newSize);
    setLeverageOverride(newLeverage);
  };

  // Recompute liquidation distance and funding carry locally based on overrides
  const activeLeverage = leverageOverride;
  const activeSize = sizeOverride;
  const activeAsset = dossier ? asReplayAsset(dossier.parsed.asset) : currentAsset;
  const bundle = getFixtureBundle(activeAsset);

  let recomputedLiq: number | null = null;
  if (dossier && activeLeverage > 1) {
    try {
      recomputedLiq = Number(
        computeLiquidationDistance(
          bundle.spotPrice,
          activeLeverage,
          dossier.parsed.direction
        ).toFixed(4)
      );
    } catch {
      recomputedLiq = null;
    }
  }

  let recomputedCarry: number | null = null;
  if (dossier && bundle.fundingRate !== null) {
    try {
      recomputedCarry = Number(
        computeFundingCarry(
          bundle.fundingRate,
          DEFAULT_WEEKEND_HOLDING_HOURS
        ).toFixed(6)
      );
    } catch {
      recomputedCarry = null;
    }
  }

  const displayedRisks: DossierRisks | null = dossier
    ? {
        liquidationDistancePct:
          recomputedLiq !== null
            ? {
                value: recomputedLiq,
                evidence: {
                  label: 'computed',
                  source: 'engine_risk',
                  timestampUtc: new Date().toISOString(),
                  note: `Liquidation distance for ${dossier.parsed.direction} at ${activeLeverage}x leverage`,
                },
              }
            : null,
        fundingCarryPct:
          recomputedCarry !== null
            ? {
                value: recomputedCarry,
                evidence: {
                  label: 'computed',
                  source: 'engine_risk',
                  timestampUtc: new Date().toISOString(),
                  note: `Funding carry over ${DEFAULT_WEEKEND_HOLDING_HOURS}h hold at interval rate ${bundle.fundingRate}`,
                },
              }
            : null,
        worstGapPct: dossier.risks.worstGapPct,
      }
    : null;

  const allEvidence = dossier
    ? [...dossier.provenance, ...bundle.evidence]
    : [];

  return (
    <AppFrame>
      <main className={styles.content}>
        {/* 1. Trade Intake */}
        <TradeIntake
          initialValue={inputValue}
          onTradeParsed={handleTradeParsed}
          onParseError={handleTradeError}
        />

        {/* 2. Prominent Dossier Refusal State (if any) */}
        {dossier?.refusal && (
          <div className={styles.refusalBanner} role="alert">
            <span className={styles.refusalCode}>{dossier.refusal.code}</span>
            <span>{dossier.refusal.reason}</span>
          </div>
        )}

        {/* 3. Parsed Confirmation */}
        {dossier && !dossier.refusal && (
          <div className={styles.confirmBanner} role="status">
            <svg
              className={styles.confirmIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <p className={styles.confirmText}>
              Parsed as:{' '}
              {dossier.parsed.direction === 'long' ? 'Long' : 'Short'}{' '}
              {dossier.parsed.asset}, {dossier.parsed.leverage}x leverage,{' '}
              {dossier.parsed.sizeUsdt.toLocaleString()} USDT margin, Friday
              close to Monday reopen. All numbers computed deterministically
              below.
            </p>
          </div>
        )}

        {/* Narration Desk Summary */}
        {narration ? (
          <div
            className={styles.narrationCard}
            role="region"
            aria-label="Desk Summary"
          >
            <span className={styles.narrationLabel}>DESK SUMMARY</span>
            <p className={styles.narrationText}>{narration}</p>
            <span className={styles.narrationFootnote}>
              AI narration - computed numbers below are deterministic
            </span>
          </div>
        ) : narrationLoading ? (
          <div
            className={styles.narrationSkeleton}
            role="status"
            aria-label="Loading desk summary"
          >
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonText} />
            <div className={styles.skeletonFootnote} />
          </div>
        ) : null}

        {/* 4. Bento Grid: RiskMetrics left, DistributionChart right */}
        {dossier && !dossier.refusal && displayedRisks && (
          <div className={styles.bentoGrid}>
            <RiskMetrics risks={displayedRisks} />
            <DistributionChart
              distribution={dossier.distribution}
              regime={dossier.regime}
            />
          </div>
        )}

        {/* 5. Live Counterfactuals */}
        {dossier && !dossier.refusal && (
          <CounterfactualControls
            sizeUsdt={activeSize}
            leverage={activeLeverage}
            onRecompute={handleCounterfactualRecompute}
            liquidationDistancePct={recomputedLiq}
            worstGapPct={dossier.risks.worstGapPct?.value ?? null}
          />
        )}

        {/* 6. Evidence Table */}
        {dossier && !dossier.refusal && (
          <EvidenceTable items={allEvidence} />
        )}
      </main>
    </AppFrame>
  );
}

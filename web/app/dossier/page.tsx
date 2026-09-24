'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppFrame from '@/components/shell/AppFrame';
import TradeIntake from '@/components/dossier/TradeIntake';
import RiskMetrics from '@/components/dossier/RiskMetrics';
import DistributionChart from '@/components/dossier/DistributionChart';
import CounterfactualControls from '@/components/dossier/CounterfactualControls';
import EvidenceTable from '@/components/dossier/EvidenceTable';
import { isSameTrade, shouldResetLiveContext } from '@/components/dossier/press-feedback';
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
import {
  buildMatchExplanation,
  deriveDateRangeFromGaps,
} from '@/components/dossier/match-explanation';
import MarketContextPanel from '@/components/dossier/MarketContextPanel';
import {
  fetchLiveMarketSnapshot,
  fetchLiveDepthStress,
  isReplayAllowlistAsset,
  type LiveMarketSnapshot,
  type DepthStressResult,
} from '@/src/data/live-market-snapshot';
import {
  computeMondayReopen,
  type McpEventContext,
  type MarketSentimentResult,
} from '@/src/data/mcp-client';
import { ASSET_MAP } from '@/src/domain/trade-parser';
import type { EvidenceItem } from '@/src/domain/types';
import styles from '@/components/dossier/DossierPage.module.css';

const DEFAULT_TRADE_INTENT =
  'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.';
export const INITIAL_EVIDENCE_TS = '2026-09-18T21:00:00.000Z';

export default function DossierPage() {
  const initialParse = parseTradeIntent(DEFAULT_TRADE_INTENT);
  const initialTrade = initialParse.ok ? initialParse.value : null;
  const initialAsset = initialTrade ? asReplayAsset(initialTrade.asset) : 'rNVDA';
  const initialBundle = getFixtureBundle(initialAsset);
  const initialDossier = initialTrade
    ? buildDossier(
        {
          parsed: initialTrade,
          spotPrice: initialBundle.spotPrice,
          fundingRate: initialBundle.fundingRate,
          gaps: initialBundle.gaps,
          nativeCandles: initialBundle.candles,
          timestampUtc: INITIAL_EVIDENCE_TS,
        },
        INITIAL_EVIDENCE_TS
      )
    : null;

  const [inputValue] = useState(DEFAULT_TRADE_INTENT);
  const [currentAsset, setCurrentAsset] = useState<ReplayAsset>(initialAsset);
  const [dossier, setDossier] = useState<Dossier | null>(initialDossier);
  const [snapshot, setSnapshot] = useState<LiveMarketSnapshot | null>(null);
  const [depthStress, setDepthStress] = useState<DepthStressResult | null>(null);
  const [eventContext, setEventContext] = useState<McpEventContext | null>(null);
  const [sentiment, setSentiment] = useState<MarketSentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrationLoading, setNarrationLoading] = useState<boolean>(false);
  const [sizeOverride, setSizeOverride] = useState<number>(
    initialTrade?.sizeUsdt ?? 5000
  );
  const [leverageOverride, setLeverageOverride] = useState<number>(
    initialTrade?.leverage ?? 3
  );
  const activeLeverage = leverageOverride;
  const activeSize = sizeOverride;
  const activeAsset = dossier ? asReplayAsset(dossier.parsed.asset) : currentAsset;
  const bundle = getFixtureBundle(activeAsset);
  const [flashConfirm, setFlashConfirm] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const rawAsset = dossier?.parsed.asset ?? currentAsset;
    if (!isReplayAllowlistAsset(rawAsset)) {
      setSnapshot({
        state: 'unavailable',
        retrievedAtUtc: null,
        spotPrice: null,
        fundingRate: null,
        rTokenSymbol: null,
        perpSymbol: null,
        sourceLabel: {
          spotPrice: 'bitget_spot',
          fundingRate: 'bitget_mix',
        },
        reason: 'asset not in replay allowlist',
      });
      return;
    }

    const mapping = ASSET_MAP[rawAsset.toLowerCase()];
    const rTokenSymbol =
      dossier?.parsed.rTokenSymbol ??
      mapping?.rTokenSymbol ??
      `${rawAsset.toUpperCase()}USDT`;
    const perpSymbol =
      dossier?.parsed.perpSymbol ??
      mapping?.perpSymbol ??
      `${rawAsset.replace(/^r/i, '').toUpperCase()}USDT`;

    fetchLiveMarketSnapshot(rTokenSymbol, perpSymbol)
      .then((result) => {
        if (active) {
          setSnapshot(result);
        }
      })
      .catch((err) => {
        if (active) {
          setSnapshot({
            state: 'unavailable',
            retrievedAtUtc: null,
            spotPrice: null,
            fundingRate: null,
            rTokenSymbol,
            perpSymbol,
            sourceLabel: {
              spotPrice: 'bitget_spot',
              fundingRate: 'bitget_mix',
            },
            reason:
              err instanceof Error ? err.message : 'Live snapshot fetch failed',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    dossier?.parsed.asset,
    currentAsset,
    dossier?.parsed.rTokenSymbol,
    dossier?.parsed.perpSymbol,
  ]);

  useEffect(() => {
    let active = true;

    if (!snapshot) {
      setDepthStress(null);
      return;
    }

    const side = dossier?.parsed.direction === 'short' ? 'sell' : 'buy';

    if (snapshot.state !== 'live' || snapshot.spotPrice === null) {
      setDepthStress({
        state: 'unavailable',
        observedAtUtc: null,
        side,
        requestedNotionalUsdt: activeSize,
        coveredNotionalUsdt: null,
        levelsConsumed: null,
        estimatedVwapPct: null,
        slippagePct: null,
        reason: snapshot.reason ?? 'Live market snapshot unavailable',
      });
      return;
    }

    const rawAsset = dossier?.parsed.asset ?? currentAsset;
    const mapping = ASSET_MAP[rawAsset.toLowerCase()];
    const rTokenSymbol =
      dossier?.parsed.rTokenSymbol ??
      mapping?.rTokenSymbol ??
      `${rawAsset.toUpperCase()}USDT`;

    fetchLiveDepthStress({
      rTokenSymbol,
      side,
      requestedNotionalUsdt: activeSize,
      referencePrice: snapshot.spotPrice,
    })
      .then((res) => {
        if (active) {
          setDepthStress(res);
        }
      })
      .catch((err) => {
        if (active) {
          setDepthStress({
            state: 'unavailable',
            observedAtUtc: null,
            side,
            requestedNotionalUsdt: activeSize,
            coveredNotionalUsdt: null,
            levelsConsumed: null,
            estimatedVwapPct: null,
            slippagePct: null,
            reason:
              err instanceof Error
                ? err.message
                : 'Live depth stress fetch failed',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    snapshot,
    dossier?.parsed.asset,
    currentAsset,
    dossier?.parsed.rTokenSymbol,
    dossier?.parsed.direction,
    activeSize,
  ]);

  useEffect(() => {
    let active = true;

    const rawAsset = dossier?.parsed.asset ?? currentAsset;
    if (!isReplayAllowlistAsset(rawAsset)) {
      setEventContext({
        state: 'unavailable',
        retrievedAtUtc: null,
        symbol: null,
        nextEarningsDate: null,
        daysUntilEarnings: null,
        withinSevenDaysOfReopen: null,
        reason: 'asset not in replay allowlist',
      });
      return;
    }

    const cleanSymbol = rawAsset
      .replace(/^[$#]/, '')
      .replace(/^r/i, '')
      .replace(/USDT$/i, '')
      .trim()
      .toUpperCase();

    const fridayRef =
      bundle.gaps.length > 0
        ? bundle.gaps[bundle.gaps.length - 1]?.episodeDate
        : null;
    const mondayReopenDate = computeMondayReopen(fridayRef);
    void mondayReopenDate;

    fetch('/api/event-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: cleanSymbol }),
    })
      .then((res) => res.json())
      .then(
        (data: { ok?: boolean; event?: McpEventContext; reason?: string }) => {
          if (active) {
            if (data?.ok && data.event) {
              setEventContext(data.event);
            } else {
              setEventContext({
                state: 'unavailable',
                retrievedAtUtc: null,
                symbol: cleanSymbol,
                nextEarningsDate: null,
                daysUntilEarnings: null,
                withinSevenDaysOfReopen: null,
                reason: data?.reason ?? 'Live event context fetch failed',
              });
            }
          }
        }
      )
      .catch((err) => {
        if (active) {
          setEventContext({
            state: 'unavailable',
            retrievedAtUtc: null,
            symbol: cleanSymbol,
            nextEarningsDate: null,
            daysUntilEarnings: null,
            withinSevenDaysOfReopen: null,
            reason:
              err instanceof Error
                ? err.message
                : 'Live event context fetch failed',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [dossier?.parsed.asset, currentAsset, bundle.gaps]);

  useEffect(() => {
    let active = true;

    fetch('/api/event-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryType: 'sentiment' }),
    })
      .then((res) => res.json())
      .then(
        (data: {
          ok?: boolean;
          sentiment?: MarketSentimentResult;
          reason?: string;
        }) => {
          if (active) {
            if (data?.ok && data.sentiment) {
              setSentiment(data.sentiment);
            } else {
              setSentiment({
                state: 'unavailable',
                retrievedAtUtc: null,
                score: null,
                rating: null,
                previousClose: null,
                previous1Month: null,
                reason: data?.reason ?? 'Live market sentiment fetch failed',
              });
            }
          }
        }
      )
      .catch((err) => {
        if (active) {
          setSentiment({
            state: 'unavailable',
            retrievedAtUtc: null,
            score: null,
            rating: null,
            previousClose: null,
            previous1Month: null,
            reason:
              err instanceof Error
                ? err.message
                : 'Live market sentiment fetch failed',
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      if (rafIdRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

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
    if (dossier && isSameTrade(parsed, dossier.parsed)) {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      setFlashConfirm(true);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashConfirm(false);
      }, 1200);
    } else {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      setFlashConfirm(false);
    }

    setLoading(true);
    setSizeOverride(parsed.sizeUsdt);
    setLeverageOverride(parsed.leverage);

    const asset = asReplayAsset(parsed.asset);
    const resetLive = shouldResetLiveContext(currentAsset, asset);
    setCurrentAsset(asset);
    if (resetLive) {
      setSnapshot(null);
      setDepthStress(null);
      setEventContext(null);
    }

    const executeRecompute = () => {
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

      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 767px)').matches
      ) {
        document.getElementById('dossier-results')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    };

    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          executeRecompute();
        });
      });
    } else {
      executeRecompute();
    }
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
  let recomputedLiq: number | null = null;
  if (dossier && activeLeverage > 1 && activeLeverage <= 25) {
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
                  timestampUtc:
                    dossier.risks.liquidationDistancePct?.evidence.timestampUtc ??
                    INITIAL_EVIDENCE_TS,
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
                  timestampUtc:
                    dossier.risks.fundingCarryPct?.evidence.timestampUtc ??
                    INITIAL_EVIDENCE_TS,
                  note: `Funding carry over ${DEFAULT_WEEKEND_HOLDING_HOURS}h hold at interval rate ${bundle.fundingRate}`,
                },
              }
            : null,
        worstGapPct: dossier.risks.worstGapPct,
      }
    : null;

  const matchExplanation = dossier
    ? buildMatchExplanation(
        {
          ...dossier.parsed,
          leverage: activeLeverage,
          sizeUsdt: activeSize,
        },
        dossier.regime,
        dossier.distribution?.sampleSize ?? bundle.stats.totalEpisodes,
        bundle.source,
        deriveDateRangeFromGaps(bundle.gaps)
      )
    : null;

  const snapshotEvidence: EvidenceItem | null = snapshot
    ? snapshot.state === 'live'
      ? {
          label: 'observed',
          source: 'bitget_live',
          timestampUtc: snapshot.retrievedAtUtc,
          note: `Bitget public REST: spot ${snapshot.spotPrice}, funding ${snapshot.fundingRate}`,
        }
      : {
          label: 'estimated',
          source: 'bitget_live',
          timestampUtc: null,
          note: `Bitget live market snapshot unavailable (${snapshot.reason ?? 'market data unavailable'}); pinned replay values in use below.`,
        }
    : null;

  const depthEvidence: EvidenceItem | null = depthStress
    ? depthStress.state === 'ok'
      ? {
          label: 'observed',
          source: 'bitget_orderbook',
          timestampUtc: depthStress.observedAtUtc,
          note: `Bitget public order book depth: estimated slippage ${
            depthStress.slippagePct !== null
              ? depthStress.slippagePct.toFixed(2) + '%'
              : '0.00%'
          } across ${
            depthStress.levelsConsumed ?? 0
          } levels for ${depthStress.requestedNotionalUsdt.toLocaleString()} USDT notional`,
        }
      : {
          label: 'estimated',
          source: 'bitget_orderbook',
          timestampUtc: null,
          note: `Bitget public order book depth unavailable (${
            depthStress.reason ?? 'unavailable'
          }); pinned replay values in use below.`,
        }
    : null;

  const eventEvidence: EvidenceItem | null = eventContext
    ? eventContext.state === 'live'
      ? eventContext.nextEarningsDate !== null
        ? {
            label: 'observed',
            source: 'mcp_earnings',
            timestampUtc: eventContext.retrievedAtUtc,
            note: `Next earnings ${eventContext.nextEarningsDate} (in ${eventContext.daysUntilEarnings} days), source bitget-mcp-server equity_calendar`,
          }
        : {
            label: 'estimated',
            source: 'mcp_earnings',
            timestampUtc: eventContext.retrievedAtUtc,
            note: 'no scheduled earnings found',
          }
      : {
          label: 'estimated',
          source: 'mcp_earnings',
          timestampUtc: null,
          note: `bitget-mcp-server event context unavailable (${
            eventContext.reason ?? 'unavailable'
          }); pinned replay values in use below.`,
        }
    : null;

  const sentimentEvidence: EvidenceItem | null =
    sentiment && sentiment.state === 'live' && sentiment.score !== null
      ? {
          label: 'observed',
          source: 'bitget_signal',
          timestampUtc: sentiment.retrievedAtUtc,
          note: `Market sentiment: Fear & Greed Index ${sentiment.score} (${sentiment.rating ?? 'neutral'})`,
        }
      : null;

  const allEvidence: EvidenceItem[] = dossier
    ? [
        ...(snapshotEvidence ? [snapshotEvidence] : []),
        ...(depthEvidence ? [depthEvidence] : []),
        ...(eventEvidence ? [eventEvidence] : []),
        ...(sentimentEvidence ? [sentimentEvidence] : []),
        ...dossier.provenance,
        ...bundle.evidence,
      ]
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

        {loading && (
          <div className={styles.recomputeNote} role="status">
            Recomputing stress dossier…
          </div>
        )}

        {/* 2. Prominent Dossier Refusal State (if any) */}
        {dossier?.refusal && (
          <div className={styles.refusalBanner} role="alert">
            <span className={styles.refusalCode}>{dossier.refusal.code}</span>
            <span>{dossier.refusal.reason}</span>
          </div>
        )}

        {/* 3. Parsed Confirmation */}
        {dossier && !dossier.refusal && (
          <div
            className={`${styles.confirmBanner} ${
              flashConfirm ? styles.confirmFlash : ''
            }`.trim()}
            role="status"
          >
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

        {/* 3.6. Market Context Panel (Phase 4.5/4.6) */}
        {dossier && !dossier.refusal && (
          <MarketContextPanel
            snapshot={snapshot}
            depth={depthStress}
            event={eventContext}
            sentiment={sentiment}
            rTokenSymbol={
              snapshot?.rTokenSymbol ??
              dossier.parsed.rTokenSymbol ??
              ASSET_MAP[activeAsset.toLowerCase()]?.rTokenSymbol ??
              'RNVDAUSDT'
            }
            perpSymbol={
              snapshot?.perpSymbol ??
              dossier.parsed.perpSymbol ??
              ASSET_MAP[activeAsset.toLowerCase()]?.perpSymbol ??
              'NVDAUSDT'
            }
          />
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
          <div id="dossier-results" className={styles.bentoGrid}>
            <RiskMetrics
              risks={displayedRisks}
              spotPrice={bundle.spotPrice}
              fundingRate={bundle.fundingRate}
              totalEpisodes={bundle.stats.totalEpisodes}
              direction={dossier.parsed.direction}
              leverage={activeLeverage}
              gaps={bundle.gaps}
              distribution={dossier.distribution}
            />
            <DistributionChart
              distribution={dossier.distribution}
              regime={dossier.regime}
              explanation={matchExplanation}
              matchExplanation={matchExplanation}
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
            originalSizeUsdt={dossier.parsed.sizeUsdt}
            originalLeverage={dossier.parsed.leverage}
            originalLiquidationDistancePct={
              dossier.risks.liquidationDistancePct?.value ?? null
            }
            direction={dossier.parsed.direction}
          />
        )}

        {/* 6. Evidence Table */}
        {dossier && !dossier.refusal && (
          <EvidenceTable items={allEvidence} trade={dossier.parsed} />
        )}
      </main>
    </AppFrame>
  );
}

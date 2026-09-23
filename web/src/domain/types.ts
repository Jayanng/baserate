/**
 * BaseRate Domain Types
 * Strict domain contracts for pre-trade stress testing of Bitget rToken weekend positions.
 *
 * Rules:
 * - Zero any
 * - Zero non-null assertions
 * - Pure TypeScript interfaces and types
 * - No Next.js or React dependencies
 */

export interface TradeIntent {
  rawInput: string;
}

export type TradeDirection = 'long' | 'short';
export type EntryTiming = 'friday_close' | 'monday_open' | 'custom';
export type HoldingWindow = 'weekend' | 'custom';
export type CollateralType = 'usdt' | 'crypto';
export type TradeEvidence = 'parsed' | 'uncertain';

export interface ParsedTrade {
  asset: string;
  rTokenSymbol: string;
  perpSymbol: string;
  direction: TradeDirection;
  sizeUsdt: number;
  leverage: number;
  entryTiming: EntryTiming;
  holdingWindow: HoldingWindow;
  collateral: CollateralType;
  evidence: TradeEvidence;
}

export type EvidenceLabel = 'observed' | 'estimated' | 'target' | 'replay' | 'computed';

export interface EvidenceItem {
  label: EvidenceLabel;
  source: string;
  timestampUtc: string | null;
  note?: string;
}

export interface EvidenceNumber {
  value: number;
  evidence: EvidenceItem;
}

export type RefusalCode = 'INSUFFICIENT_EVIDENCE' | 'UNAVAILABLE' | 'PARSE_UNCERTAIN';

export interface RefusalState {
  code: RefusalCode;
  reason: string;
}

export interface FrozenCollateralState {
  frozenIndex: number | null;
  freezeTimeUtc: string | null;
  ruleBasis: string;
}

export interface FundingObservation {
  ratePerInterval: number | null;
  intervalHours: 8;
  proxyUsed: boolean;
  source: 'bitget_mix' | 'unavailable';
  note?: string;
  label?: EvidenceLabel;
  evidence?: EvidenceItem;
}

export interface WeekendGapObservation {
  pct: number;
  episodeDate: string;
  source: 'yahoo_native' | 'unavailable';
}

export type RegimeTag =
  | 'trend_up'
  | 'trend_down'
  | 'chop'
  | 'capitulation'
  | 'squeeze'
  | 'insufficient_evidence';

export interface DistributionCategory {
  label: string;
  count: number;
  pct: number;
}

export interface OutcomeDistribution {
  sampleSize: number;
  categories: DistributionCategory[];
  medianNext5dPct: number | null;
  worstNext5dPct: number | null;
  worstEpisodeDate: string | null;
}

export type HealthStatus = 'ok' | 'degraded' | 'unavailable';

export interface DataHealth {
  bitget: HealthStatus;
  yahoo: HealthStatus;
  notes?: string;
}

export interface MarketSnapshot {
  asset: string;
  rTokenSymbol: string;
  perpSymbol: string;
  spotPrice: EvidenceNumber | null;
  perpPrice: EvidenceNumber | null;
  funding: FundingObservation;
  frozenCollateral: FrozenCollateralState;
  timestampUtc: string;
  health: DataHealth;
  depthTopUsdt?: number | null;
}

export interface DossierRisks {
  liquidationDistancePct: EvidenceNumber | null;
  fundingCarryPct: EvidenceNumber | null;
  worstGapPct: EvidenceNumber | null;
}

export type RiskInterpretationCode =
  | 'INCOMPLETE_EVIDENCE'
  | 'HISTORY_BREACHED_LIQUIDATION'
  | 'HISTORY_WITHIN_LIQUIDATION';

export type RiskInterpretationState =
  | 'incomplete'
  | 'breached'
  | 'within_buffer';

export interface RiskInterpretation {
  headline: string;
  summary: string;
  code: RiskInterpretationCode;
  state: RiskInterpretationState;
  isComplete: boolean;
  supportingFacts: string[];
  inputs: {
    liquidationDistancePct: number | null;
    worstGapPct: number | null;
    gapThroughLiquidationRate: number | null;
    fundingCarryPct: number | null;
    sampleSize: number | null;
  };
  provenanceLabel: EvidenceLabel;
}

export interface Dossier {
  parsed: ParsedTrade;
  risks: DossierRisks;
  regime: RegimeTag;
  distribution: OutcomeDistribution | null;
  refusal: RefusalState | null;
  provenance: EvidenceItem[];
  interpretation?: RiskInterpretation | null;
}

export type ForecastStatus = 'hit' | 'miss' | 'pending';
export type ForecastMode = 'live' | 'replay';

export interface ForecastRecord {
  id: string;
  issuedAtUtc: string;
  tradeHash: string;
  bandLowPct: number;
  bandHighPct: number;
  regime: RegimeTag;
  status: ForecastStatus;
  mode: ForecastMode;
}

export type CalibrationStatus = 'reliable' | 'provisional' | 'adjusted';

export interface CalibrationRegime {
  regime: RegimeTag;
  total: number;
  hits: number;
  status: CalibrationStatus;
}

export interface CalibrationRecord {
  total: number;
  hits: number;
  misses: number;
  pending: number;
  byRegime: CalibrationRegime[];
}

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

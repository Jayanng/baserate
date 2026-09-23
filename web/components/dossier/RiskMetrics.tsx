import type { DossierRisks, EvidenceLabel } from '@/src/domain/types';
import {
  liquidationExplain,
  fundingExplain,
  worstGapExplain,
  type VerificationExplanation,
} from './verification';
import styles from './DossierPage.module.css';

interface RiskMetricsProps {
  risks: DossierRisks;
  spotPrice?: number;
  fundingRate?: number;
  totalEpisodes?: number;
  direction?: 'long' | 'short';
  leverage?: number;
  holdingHours?: number;
}

function getEvidenceTagClass(label: EvidenceLabel | string): string {
  switch (label.toLowerCase()) {
    case 'observed':
      return styles.tagObserved;
    case 'estimated':
      return styles.tagEstimated;
    case 'computed':
      return styles.tagComputed;
    case 'replay':
      return styles.tagReplay;
    case 'target':
      return styles.tagTarget;
    default:
      return styles.tagComputed;
  }
}

function MetricHowDetails({ explanation }: { explanation: VerificationExplanation }) {
  return (
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
        {explanation.inputs.map((inp) => (
          <div key={inp.label} className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>{inp.label}:</span>{' '}
            <span className={styles.metricHowVal}>{inp.value}</span>
          </div>
        ))}
        <div className={styles.metricHowRow}>
          <span className={styles.metricHowKey}>formula:</span>{' '}
          <span className={styles.metricHowVal}>{explanation.formula}</span>
        </div>
        <div className={styles.metricHowDivider} />
        <div className={`${styles.metricHowRow} ${styles.metricHowResultRow}`}>
          <span className={styles.metricHowKey}>result:</span>{' '}
          <span className={styles.metricHowResultVal}>{explanation.result}</span>
        </div>
      </div>
    </details>
  );
}

export default function RiskMetrics({
  risks,
  spotPrice,
  fundingRate,
  totalEpisodes,
  direction,
  leverage,
  holdingHours,
}: RiskMetricsProps) {
  const liqNote = risks.liquidationDistancePct?.evidence?.note ?? '';
  const dirMatch = liqNote.match(/\b(long|short)\b/i);
  const levMatch = liqNote.match(/(\d+(?:\.\d+)?)x/i);
  const activeDirection =
    direction ?? (dirMatch ? (dirMatch[1].toLowerCase() as 'long' | 'short') : 'long');
  const activeLeverage = leverage ?? (levMatch ? Number(levMatch[1]) : 3);

  const liqExplanation =
    spotPrice !== undefined && risks.liquidationDistancePct !== null
      ? liquidationExplain(spotPrice, activeLeverage, activeDirection)
      : null;

  const fundingExplanation =
    fundingRate !== undefined && risks.fundingCarryPct !== null
      ? fundingExplain(fundingRate, holdingHours ?? 60)
      : null;

  const episodesCount = totalEpisodes ?? 1227;
  const worstDate = '2020-03-13';
  const datasetDesc = `${episodesCount.toLocaleString()} Fri->Mon gaps, NVDA daily closes 1999-2026`;
  const worstGapExplanation =
    totalEpisodes !== undefined && risks.worstGapPct !== null
      ? worstGapExplain(
          worstDate,
          episodesCount,
          datasetDesc,
          risks.worstGapPct.value
        )
      : null;

  return (
    <div className={styles.riskCard}>
      <h3 className={styles.cardTitle}>Bitget-native risk</h3>
      <div className={styles.riskStack}>
        {/* Tile 1: Liquidation distance */}
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Liquidation line vs frozen index</span>
          {risks.liquidationDistancePct !== null ? (
            <>
              <span className={`${styles.metricValue} ${styles.metricCoral}`}>
                {risks.liquidationDistancePct.value > 0 ? '+' : ''}
                {risks.liquidationDistancePct.value.toFixed(1)}%
              </span>
              <span
                className={`${styles.evidenceTag} ${getEvidenceTagClass(
                  risks.liquidationDistancePct.evidence.label
                )}`}
              >
                {risks.liquidationDistancePct.evidence.label}
              </span>
              {liqExplanation && <MetricHowDetails explanation={liqExplanation} />}
            </>
          ) : (
            <span className={styles.pillUnavailable}>UNAVAILABLE</span>
          )}
        </div>

        {/* Tile 2: Funding carry */}
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Funding carry, 60 closed hours</span>
          {risks.fundingCarryPct !== null ? (
            <>
              <span className={`${styles.metricValue} ${styles.metricInk}`}>
                {risks.fundingCarryPct.value > 0 ? '+' : ''}
                {risks.fundingCarryPct.value.toFixed(2)}%
              </span>
              <span
                className={`${styles.evidenceTag} ${getEvidenceTagClass(
                  risks.fundingCarryPct.evidence.label
                )}`}
              >
                {risks.fundingCarryPct.evidence.label}
              </span>
              {fundingExplanation && (
                <MetricHowDetails explanation={fundingExplanation} />
              )}
            </>
          ) : (
            <span className={styles.pillUnavailable}>UNAVAILABLE</span>
          )}
        </div>

        {/* Tile 3: Worst historical gap */}
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Worst Fri to Mon gap, 10y</span>
          {risks.worstGapPct !== null ? (
            <>
              <span className={`${styles.metricValue} ${styles.metricInk}`}>
                {risks.worstGapPct.value > 0 ? '+' : ''}
                {risks.worstGapPct.value.toFixed(1)}%
              </span>
              <span
                className={`${styles.evidenceTag} ${getEvidenceTagClass(
                  risks.worstGapPct.evidence.label
                )}`}
              >
                {risks.worstGapPct.evidence.label}
              </span>
              {worstGapExplanation && (
                <MetricHowDetails explanation={worstGapExplanation} />
              )}
            </>
          ) : (
            <span className={styles.pillUnavailable}>UNAVAILABLE</span>
          )}
        </div>
      </div>
    </div>
  );
}

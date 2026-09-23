import type { DossierRisks, EvidenceLabel } from '@/src/domain/types';
import styles from './DossierPage.module.css';

interface RiskMetricsProps {
  risks: DossierRisks;
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

export default function RiskMetrics({ risks }: RiskMetricsProps) {
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
            </>
          ) : (
            <span className={styles.pillUnavailable}>UNAVAILABLE</span>
          )}
        </div>
      </div>
    </div>
  );
}

import type { OutcomeDistribution, RegimeTag } from '@/src/domain/types';
import styles from './DossierPage.module.css';

interface DistributionChartProps {
  distribution: OutcomeDistribution | null;
  regime?: RegimeTag;
}

function getFillClass(label: string): string {
  if (label.includes('Closed up') || label.includes('up')) return styles.distFillLime;
  if (label.includes('Flat')) return styles.distFillLavender;
  if (label.includes('Down 1-5%')) return styles.distFillPeach;
  if (label.includes('Down >5%')) return styles.distFillCoral;
  if (label.includes('Gap') || label.includes('liq')) return styles.distFillCoralDeep;
  return styles.distFillLavender;
}

export default function DistributionChart({
  distribution,
  regime,
}: DistributionChartProps) {
  if (!distribution) {
    return (
      <div className={styles.distributionSection}>
        <h3 className={styles.cardTitle}>Historical base rate</h3>
        <div className={styles.refusalBanner}>
          <span className={styles.refusalCode}>INSUFFICIENT_EVIDENCE</span>
          <span>
            Historical distribution unavailable: minimum 5 comparable episodes required.
          </span>
        </div>
      </div>
    );
  }

  const formattedRegime = regime
    ? regime === 'insufficient_evidence'
      ? 'insufficient evidence'
      : `${regime.replace('_', '-')} · elevated vol`
    : null;

  return (
    <div className={styles.distributionSection}>
      <h3 className={styles.cardTitle}>
        Historical base rate · {distribution.sampleSize} comparable weekends
      </h3>

      <div>
        {distribution.categories.map((cat) => (
          <div key={cat.label} className={styles.distRow}>
            <span className={styles.distLabel}>{cat.label}</span>
            <div className={styles.distTrack}>
              <div
                className={`${styles.distFill} ${getFillClass(cat.label)}`}
                style={{ width: `${Math.max(cat.pct, 0)}%` }}
              />
            </div>
            <span className={styles.distPct}>{cat.pct}%</span>
          </div>
        ))}
      </div>

      <div className={styles.distMeta}>
        {formattedRegime && (
          <span className={styles.distMetaItem}>
            Regime: <b>{formattedRegime}</b>
          </span>
        )}
        <span className={styles.distMetaItem}>
          Median:{' '}
          <b>
            {distribution.medianNext5dPct !== null
              ? `${distribution.medianNext5dPct > 0 ? '+' : ''}${distribution.medianNext5dPct.toFixed(1)}%`
              : '—'}
          </b>
        </span>
        <span className={styles.distMetaItem}>
          Worst:{' '}
          <b>
            {distribution.worstNext5dPct !== null
              ? `${distribution.worstNext5dPct.toFixed(1)}%${
                  distribution.worstEpisodeDate ? ` (${distribution.worstEpisodeDate})` : ''
                }`
              : '—'}
          </b>
        </span>
      </div>
    </div>
  );
}

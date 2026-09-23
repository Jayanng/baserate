import type { OutcomeDistribution, RegimeTag, ParsedTrade } from '@/src/domain/types';
import { buildMatchExplanation, type MatchExplanation } from './match-explanation';
import styles from './DossierPage.module.css';

interface DistributionChartProps {
  distribution: OutcomeDistribution | null;
  regime?: RegimeTag;
  sampleSize?: number;
  explanation?: MatchExplanation | null;
  matchExplanation?: MatchExplanation | null;
  parsed?: ParsedTrade | null;
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
  sampleSize,
  explanation,
  matchExplanation,
  parsed,
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

  const sampleCount = sampleSize ?? distribution.sampleSize;

  const formattedRegime = regime
    ? regime === 'insufficient_evidence'
      ? 'insufficient evidence'
      : `${regime.replace('_', '-')} · elevated vol`
    : null;

  const activeExplanation =
    explanation ??
    matchExplanation ??
    (parsed
      ? buildMatchExplanation(parsed, regime ?? 'insufficient_evidence', sampleCount)
      : null);

  return (
    <div className={styles.distributionSection}>
      <h3 className={styles.cardTitle}>
        Historical base rate · {sampleCount} comparable weekends
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

      {activeExplanation && (
        <details className={styles.distHow} data-testid="why-these-weekends">
          <summary className={styles.metricHowSummary}>
            <span>Why these weekends</span>
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
              <span className={styles.metricHowKey}>asset:</span>{' '}
              <span className={styles.metricHowVal}>{activeExplanation.asset}</span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>direction:</span>{' '}
              <span className={styles.metricHowVal}>{activeExplanation.direction}</span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>leverage:</span>{' '}
              <span className={styles.metricHowVal}>{activeExplanation.leverage}x</span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>holding window:</span>{' '}
              <span className={styles.metricHowVal}>{activeExplanation.holdingWindow}</span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>entry timing:</span>{' '}
              <span className={styles.metricHowVal}>{activeExplanation.entryTiming}</span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>regime:</span>{' '}
              <span className={styles.metricHowVal}>
                {String(activeExplanation.regime).replace(/_/g, '-')}
              </span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>sample size:</span>{' '}
              <span className={styles.metricHowVal}>
                {activeExplanation.sampleSize.toLocaleString()} episodes
              </span>
            </div>
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>history:</span>{' '}
              <span className={styles.metricHowVal}>
                {activeExplanation.historySourceDateRange}
              </span>
            </div>
            <div className={styles.metricHowDivider} />
            <div className={styles.metricHowRow}>
              <span className={styles.metricHowKey}>policy:</span>{' '}
              <span className={styles.metricHowVal}>
                {activeExplanation.matchingPolicy}
              </span>
            </div>
          </div>
        </details>
      )}

      <details className={styles.distHow}>
        <summary className={styles.metricHowSummary}>
          <span>How these buckets are built</span>
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
            <span className={styles.metricHowKey}>buckets:</span>{' '}
            <span className={styles.metricHowVal}>
              {'<= -15% gap thru liquidation / -15% to -5% down >5% / -5% to -1% down 1-5% / -1% to +1% flat / > +1% closed up'}
            </span>
          </div>
          <div className={styles.metricHowRow}>
            <span className={styles.metricHowKey}>sample:</span>{' '}
            <span className={styles.metricHowVal}>
              {`${sampleCount} episodes, regime-matched from dataset`}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}

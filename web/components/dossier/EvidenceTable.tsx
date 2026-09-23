import type { EvidenceItem, EvidenceLabel } from '@/src/domain/types';
import styles from './DossierPage.module.css';

interface EvidenceTableProps {
  items: EvidenceItem[];
}

function getTagClass(label: EvidenceLabel | string): string {
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

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return iso.replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return iso;
  }
}

export default function EvidenceTable({ items }: EvidenceTableProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={styles.evidenceSection}>
      <h3 className={styles.cardTitle}>Evidence & Provenance</h3>
      <div className={styles.tableWrapper}>
        <div className={styles.evidenceTable}>
          <div className={styles.evidenceHeaderRow}>
            <span className={styles.colLabel}>Label</span>
            <span className={styles.colSource}>Source</span>
            <span className={styles.colTimestamp}>Timestamp</span>
            <span className={styles.colNote}>Note</span>
          </div>
          <div>
            {items.map((item, idx) => (
              <div
                key={`${item.source}-${item.label}-${idx}`}
                className={styles.evidenceRow}
              >
                <div className={styles.colLabel}>
                  <span
                    className={`${styles.evidenceTag} ${getTagClass(item.label)}`}
                  >
                    {item.label}
                  </span>
                </div>
                <div className={styles.colSource}>{item.source}</div>
                <div className={styles.colTimestamp}>
                  {formatTimestamp(item.timestampUtc)}
                </div>
                <div className={styles.colNote}>{item.note || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

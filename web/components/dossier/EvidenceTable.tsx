import type { EvidenceItem, EvidenceLabel, ParsedTrade } from '@/src/domain/types';
import { buildSourceHref, sourceLinkKind } from './source-links';
import styles from './DossierPage.module.css';

interface EvidenceTableProps {
  items: EvidenceItem[];
  trade?: ParsedTrade | null;
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

export default function EvidenceTable({ items, trade }: EvidenceTableProps) {
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
            {items.map((item, idx) => {
              const href = buildSourceHref(item, trade ?? null);
              const kind = sourceLinkKind(item.source);
              const kindTitle =
                kind === 'live'
                  ? 'Opens live public endpoint (current values)'
                  : kind === 'code'
                    ? 'Opens computation source in GitHub'
                    : undefined;

              return (
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
                  <div className={styles.colSource}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                        title={kindTitle ?? href}
                      >
                        {item.source}
                        <svg
                          className={styles.sourceLinkIcon}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        {kind && (
                          <span
                            className={styles.sourceKindTag}
                            title={kindTitle}
                          >
                            <span
                              className={`${styles.sourceKindDot} ${
                                kind === 'live'
                                  ? styles.sourceKindLive
                                  : styles.sourceKindCode
                              }`}
                              title={kindTitle}
                              aria-hidden="true"
                            />
                            {kind}
                          </span>
                        )}
                      </a>
                    ) : (
                      item.source
                    )}
                  </div>
                <div className={styles.colTimestamp}>
                  {formatTimestamp(item.timestampUtc)}
                </div>
                <div className={styles.colNote}>{item.note || '—'}</div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

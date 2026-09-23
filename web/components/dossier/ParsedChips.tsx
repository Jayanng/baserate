import type { ParsedTrade } from '@/src/domain/types';
import styles from './DossierPage.module.css';

interface ParsedChipsProps {
  parsed: ParsedTrade;
}

export default function ParsedChips({ parsed }: ParsedChipsProps) {
  const directionLabel = parsed.direction === 'long' ? 'Long' : 'Short';
  const sizeLabel = `${parsed.sizeUsdt.toLocaleString()} USDT`;
  const leverageLabel = `${parsed.leverage}x leverage`;
  const windowLabel = parsed.holdingWindow === 'weekend' ? 'Weekend hold' : 'Custom hold';

  return (
    <div className={styles.parsedChips} aria-label="Parsed trade parameters">
      <span className={styles.chip}>{parsed.asset}</span>
      <span className={styles.chip}>{directionLabel}</span>
      <span className={styles.chip}>{leverageLabel}</span>
      <span className={styles.chip}>{sizeLabel}</span>
      <span className={styles.chip}>{windowLabel}</span>
      <span className={`${styles.chip} ${styles.chipReadonly}`}>Read-only</span>
    </div>
  );
}

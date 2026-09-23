'use client';

import React, { useState } from 'react';
import { parseTradeIntent } from '@/src/domain/trade-parser';
import type { ParsedTrade, RefusalState } from '@/src/domain/types';
import ParsedChips from './ParsedChips';
import styles from './DossierPage.module.css';

interface TradeIntakeProps {
  initialValue?: string;
  onTradeParsed: (parsed: ParsedTrade) => void;
  onParseError?: (error: RefusalState) => void;
}

export default function TradeIntake({
  initialValue = 'I want to long rNVDA over the weekend at 3x with 5,000 USDT margin.',
  onTradeParsed,
  onParseError,
}: TradeIntakeProps) {
  const initialParse = initialValue ? parseTradeIntent(initialValue) : null;
  const [inputValue, setInputValue] = useState(initialValue);
  const [parsedTrade, setParsedTrade] = useState<ParsedTrade | null>(
    initialParse && initialParse.ok ? initialParse.value : null
  );
  const [error, setError] = useState<RefusalState | null>(
    initialParse && !initialParse.ok ? initialParse.error : null
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const result = parseTradeIntent(inputValue);
    if (result.ok) {
      setParsedTrade(result.value);
      setError(null);
      onTradeParsed(result.value);
    } else {
      setParsedTrade(null);
      setError(result.error);
      onParseError?.(result.error);
    }
  };

  return (
    <div className={styles.intakeSection}>
      <label className={styles.intakeLabel} htmlFor="trade-intake-input">
        What are you considering?
      </label>
      <form onSubmit={handleSubmit} className={styles.intakeRow}>
        <input
          id="trade-intake-input"
          type="text"
          className={styles.intakeInput}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What are you considering? e.g. I want to long rNVDA over the weekend at 3x with 5,000 USDT margin."
        />
        <button type="submit" className={styles.submitButton}>
          Stress this trade
        </button>
      </form>

      {error && (
        <div
          className={styles.refusalBanner}
          role="alert"
          style={{ marginTop: 'var(--br-space-4)' }}
        >
          <span className={styles.refusalCode}>{error.code}</span>
          <span>{error.reason}</span>
        </div>
      )}

      {parsedTrade && <ParsedChips parsed={parsedTrade} />}
    </div>
  );
}

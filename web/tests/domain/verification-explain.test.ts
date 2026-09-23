import { describe, it, expect } from 'vitest';
import {
  liquidationExplain,
  fundingExplain,
  worstGapExplain,
} from '@/components/dossier/verification';

describe('verification-explain', () => {
  it('liquidationExplain(228.2, 3, "long").result contains "-32.8" and inputs include "228.2" and "3x"', () => {
    const explanation = liquidationExplain(228.2, 3, 'long');
    expect(explanation.result).toContain('-32.8');

    const inputsJson = JSON.stringify(explanation.inputs);
    expect(inputsJson).toContain('228.2');
    expect(inputsJson).toContain('3x');
  });

  it('liquidationExplain formula differs between long and short', () => {
    const longExp = liquidationExplain(228.2, 3, 'long');
    const shortExp = liquidationExplain(228.2, 3, 'short');
    expect(longExp.formula).not.toBe(shortExp.formula);
    expect(longExp.formula).toContain('+ 0.005');
    expect(shortExp.formula).toContain('- 0.005');
  });

  it('fundingExplain(0.000219, 60).result contains "0.164"', () => {
    const explanation = fundingExplain(0.000219, 60);
    expect(explanation.result).toContain('0.164');
    expect(explanation.inputs.some((i) => i.value.includes('60h'))).toBe(true);
    expect(explanation.inputs.some((i) => i.value.includes('7.5'))).toBe(true);
  });

  it('worstGapExplain returns dataSource text containing the dataset description passed in', () => {
    const datasetDescription = '1,227 Fri->Mon gaps, NVDA daily closes 1999-2026';
    const explanation = worstGapExplain('2020-03-13', 1227, datasetDescription);
    const hasDataSource = explanation.inputs.some((inp) =>
      inp.value.includes(datasetDescription)
    );
    expect(hasDataSource).toBe(true);
  });

  it('every explain returns >= 2 inputs and non-empty formula and result', () => {
    const liq = liquidationExplain(228.2, 3, 'long');
    expect(liq.inputs.length).toBeGreaterThanOrEqual(2);
    expect(liq.formula.trim().length).toBeGreaterThan(0);
    expect(liq.result.trim().length).toBeGreaterThan(0);

    const funding = fundingExplain(0.000219, 60);
    expect(funding.inputs.length).toBeGreaterThanOrEqual(2);
    expect(funding.formula.trim().length).toBeGreaterThan(0);
    expect(funding.result.trim().length).toBeGreaterThan(0);

    const worst = worstGapExplain(
      '2020-03-13',
      1227,
      '1,227 Fri->Mon gaps, NVDA daily closes 1999-2026'
    );
    expect(worst.inputs.length).toBeGreaterThanOrEqual(2);
    expect(worst.formula.trim().length).toBeGreaterThan(0);
    expect(worst.result.trim().length).toBeGreaterThan(0);
  });
});

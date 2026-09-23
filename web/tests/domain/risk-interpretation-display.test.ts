import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RiskInterpretationCard from '@/components/dossier/RiskInterpretationCard';
import RiskMetrics from '@/components/dossier/RiskMetrics';
import { interpretRisk } from '@/src/engine/risk-interpretation';

describe('RiskInterpretationCard & RiskMetrics display', () => {
  const FORBIDDEN_WORDS_REGEX =
    /\b(buy|sell|hold|safe|unsafe|safer|safest|advice|recommend|recommendation)\b/i;

  it('renders compact interpretation card with computed label and visible conclusion', () => {
    const interpretation = interpretRisk({
      liquidationDistancePct: -32.8333,
      worstGapPct: -18.45,
      fundingCarryPct: 0.16425,
      sampleSize: 1227,
    });

    const html = renderToStaticMarkup(
      React.createElement(RiskInterpretationCard, { interpretation })
    );

    // Visible without opening a disclosure:
    expect(html).toContain('Deterministic interpretation');
    expect(html).toContain('computed');
    expect(html).toContain('Observed history did not reach liquidation line');
    expect(html).toContain(
      'Observed history did not reach the current liquidation line, but the tail remains material.'
    );

    // HOW disclosure present:
    expect(html).toContain('<details');
    expect(html).toContain('HOW');
    expect(html).toContain('liquidation distance:');
    expect(html).toContain('-32.8%');
    expect(html).toContain('worst historical gap:');
    expect(html).toContain('-18.4%');
    expect(html).toContain('gap-through rate:');
    expect(html).toContain('0.0%');
    expect(html).toContain('sample size:');
    expect(html).toContain('1,227 episodes');
    expect(html).toContain('funding carry:');
    expect(html).toContain('+0.16%');
    expect(html).toContain('HISTORY_WITHIN_LIQUIDATION');

    // No forbidden words
    expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
  });

  it('renders breached state with distinct headline and liquidation breach summary', () => {
    const interpretation = interpretRisk({
      liquidationDistancePct: -9.5,
      worstGapPct: -18.45,
      fundingCarryPct: 0.16,
      sampleSize: 1227,
    });

    const html = renderToStaticMarkup(
      React.createElement(RiskInterpretationCard, { interpretation })
    );

    expect(html).toContain('Historical sample includes liquidation breaches');
    expect(html).toContain(
      'The historical sample includes outcomes through the proposed liquidation distance.'
    );
    expect(html).toContain('HISTORY_BREACHED_LIQUIDATION');
    expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
  });

  it('renders incomplete evidence refusal state cleanly', () => {
    const interpretation = interpretRisk({
      liquidationDistancePct: null,
      worstGapPct: null,
      sampleSize: 0,
    });

    const html = renderToStaticMarkup(
      React.createElement(RiskInterpretationCard, { interpretation })
    );

    expect(html).toContain('Evidence incomplete');
    expect(html).toContain(
      'Evidence is incomplete, so no historical conclusion is shown.'
    );
    expect(html).toContain('INCOMPLETE_EVIDENCE');
    expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
  });

  it('renders inside RiskMetrics above the metric tiles', () => {
    const html = renderToStaticMarkup(
      React.createElement(RiskMetrics, {
        risks: {
          liquidationDistancePct: {
            value: -32.8333,
            evidence: {
              label: 'computed',
              source: 'engine_risk',
              timestampUtc: null,
            },
          },
          fundingCarryPct: {
            value: 0.16425,
            evidence: {
              label: 'computed',
              source: 'engine_risk',
              timestampUtc: null,
            },
          },
          worstGapPct: {
            value: -18.45,
            evidence: {
              label: 'computed',
              source: 'engine_risk',
              timestampUtc: null,
            },
          },
        },
        spotPrice: 228,
        fundingRate: 0.000219,
        totalEpisodes: 1227,
        direction: 'long',
        leverage: 3,
      })
    );

    expect(html).toContain('Bitget-native risk');
    expect(html).toContain('Deterministic interpretation');
    expect(html).toContain('Observed history did not reach liquidation line');
    expect(html).toContain('Liquidation line vs frozen index');
    expect(html).toContain('Funding carry, 60 closed hours');
    expect(html).toContain('Worst Fri to Mon gap, 10y');
    expect(html).not.toMatch(FORBIDDEN_WORDS_REGEX);
  });
});

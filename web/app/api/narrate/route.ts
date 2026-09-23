import { NextResponse } from 'next/server';
import type { Dossier } from '@/src/domain/types';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT =
  'You are the narration voice of BaseRate, a read-only pre-trade stress desk for Bitget rToken weekend trades. You receive a fully computed risk dossier. You write EXACTLY two short sentences in plain English summarizing what the desk found. HARD RULES: You must NEVER compute, derive, estimate, or invent any number. You may only reference numbers that appear verbatim in the dossier JSON you were given. You may paraphrase the desk deterministic interpretation, but never strengthen it or issue trade instructions. Never give buy/sell/long/short advice. Never say should. If the dossier contains a refusal state, say the desk could not complete the analysis and why. Output only the two sentences, no preamble, no markdown.';

/**
 * Extracts all allowed number representations from the payload sent to the LLM,
 * including exact strings and toFixed variants for precision formats.
 */
export function extractAllowedNumbers(payload: unknown): Set<string> {
  const allowed = new Set<string>();

  function addNumberVariants(num: number) {
    if (!Number.isFinite(num)) return;
    allowed.add(String(num));
    const abs = Math.abs(num);
    allowed.add(String(abs));
    allowed.add(`-${abs}`);

    // Generate toFixed variants (0 to 6 decimal places)
    for (let d = 0; d <= 6; d++) {
      const fixed = num.toFixed(d);
      allowed.add(fixed);
      const absFixed = abs.toFixed(d);
      allowed.add(absFixed);
      allowed.add(`-${absFixed}`);
    }
  }

  function walk(val: unknown) {
    if (val === null || val === undefined) return;
    if (typeof val === 'number') {
      addNumberVariants(val);
    } else if (typeof val === 'string') {
      const matches = val.match(/-?\d+(\.\d+)?/g);
      if (matches) {
        for (const m of matches) {
          allowed.add(m);
          const parsed = Number(m);
          if (!Number.isNaN(parsed)) {
            addNumberVariants(parsed);
          }
        }
      }
    } else if (Array.isArray(val)) {
      for (const item of val) {
        walk(item);
      }
    } else if (typeof val === 'object') {
      for (const k of Object.keys(val as object)) {
        walk((val as Record<string, unknown>)[k]);
      }
    }
  }

  walk(payload);
  return allowed;
}

/**
 * Verifies that every numeric token in the narration appears in the allowed numbers set.
 */
export function validateNarrationNumbers(
  narration: string,
  allowedNumbers: Set<string>
): boolean {
  const tokens = narration.match(/-?\d+(\.\d+)?/g);
  if (!tokens || tokens.length === 0) {
    return true;
  }
  for (const token of tokens) {
    if (!allowedNumbers.has(token)) {
      return false;
    }
  }
  return true;
}

export async function POST(req: Request) {
  const apiKey = process.env.GMI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({
      ok: true,
      narration: null,
      reason: 'narration_disabled',
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  }

  const dossier = (body as { dossier?: Dossier } | null)?.dossier;
  if (!dossier) {
    return NextResponse.json({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  }

  const payload = {
    regime: dossier.regime,
    risks: {
      liquidationDistancePct:
        dossier.risks?.liquidationDistancePct?.value ?? null,
      fundingCarryPct: dossier.risks?.fundingCarryPct?.value ?? null,
      worstGapPct: dossier.risks?.worstGapPct?.value ?? null,
    },
    interpretation: dossier.interpretation
      ? {
          headline: dossier.interpretation.headline,
          summary: dossier.interpretation.summary,
          code: dossier.interpretation.code,
        }
      : null,
    distribution: dossier.distribution
      ? {
          sampleSize: dossier.distribution.sampleSize,
          categories: dossier.distribution.categories.map((c) => ({
            label: c.label,
            pct: c.pct,
          })),
        }
      : null,
    refusal: dossier.refusal ?? null,
  };

  const baseUrl = (
    process.env.GMI_BASE_URL || 'https://api.gmi-serving.com/v1'
  ).replace(/\/+$/, '');
  const completionsUrl = `${baseUrl}/chat/completions`;

  try {
    const res = await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V4-Flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: true,
        narration: null,
        reason: 'llm_unavailable',
      });
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string') {
      return NextResponse.json({
        ok: true,
        narration: null,
        reason: 'llm_unavailable',
      });
    }

    const cleaned = rawContent
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 400)
      .trim();

    if (!cleaned) {
      return NextResponse.json({
        ok: true,
        narration: null,
        reason: 'llm_unavailable',
      });
    }

    const allowedNumbers = extractAllowedNumbers(payload);
    if (!validateNarrationNumbers(cleaned, allowedNumbers)) {
      return NextResponse.json({
        ok: true,
        narration: null,
        reason: 'number_guard_triggered',
      });
    }

    return NextResponse.json({
      ok: true,
      narration: cleaned,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  }
}

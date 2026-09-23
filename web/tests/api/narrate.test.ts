import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  POST,
  extractAllowedNumbers,
  validateNarrationNumbers,
} from '@/app/api/narrate/route';
import type { Dossier } from '@/src/domain/types';

describe('POST /api/narrate', () => {
  const originalEnv = { ...process.env };

  const mockDossier: Dossier = {
    parsed: {
      asset: 'rNVDA',
      rTokenSymbol: 'rNVDA',
      perpSymbol: 'NVDAUSDT',
      direction: 'long',
      sizeUsdt: 5000,
      leverage: 3,
      entryTiming: 'friday_close',
      holdingWindow: 'weekend',
      collateral: 'usdt',
      evidence: 'parsed',
    },
    risks: {
      liquidationDistancePct: {
        value: 33.3333,
        evidence: {
          label: 'computed',
          source: 'engine_risk',
          timestampUtc: null,
        },
      },
      fundingCarryPct: {
        value: 0.001314,
        evidence: {
          label: 'computed',
          source: 'engine_risk',
          timestampUtc: null,
        },
      },
      worstGapPct: {
        value: -16.2,
        evidence: {
          label: 'computed',
          source: 'engine_risk',
          timestampUtc: null,
        },
      },
    },
    regime: 'trend_down',
    distribution: {
      sampleSize: 231,
      categories: [
        { label: 'Closed up (> 1%)', count: 102, pct: 44 },
        { label: 'Flat ([-1%, 1%])', count: 28, pct: 12 },
        { label: 'Down 1-5% ((-5%, -1%))', count: 65, pct: 28 },
        { label: 'Down >5% ((-15%, -5%])', count: 30, pct: 13 },
        { label: 'Gap thru liq (<= -15%)', count: 6, pct: 3 },
      ],
      medianNext5dPct: null,
      worstNext5dPct: null,
      worstEpisodeDate: null,
    },
    refusal: null,
    provenance: [],
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('Missing GMI_API_KEY -> narration null, reason narration_disabled', async () => {
    delete process.env.GMI_API_KEY;

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: null,
      reason: 'narration_disabled',
    });
  });

  it("LLM returns narration containing a number NOT in the dossier (e.g. 'down 27%') -> number_guard_triggered, narration null", async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  'The desk detected trend_down regime with expected drop down 27%. Liquidation distance remains critical.',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: null,
      reason: 'number_guard_triggered',
    });
  });

  it('LLM returns narration using only dossier numbers -> narration passes through', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    const validText =
      'The desk classified the regime as trend_down with a worst historical gap of -16.2%. The outcome distribution shows 44% of 231 observed episodes closed up.';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: validText,
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: validText,
    });
  });

  it('GMI fetch throws -> llm_unavailable, narration null, HTTP 200 always', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Connection timed out')
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  });

  it('GMI returns non-200 -> llm_unavailable, narration null, HTTP 200 always', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Rate limit reached', { status: 429 })
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  });

  it('Refusal state in dossier is passed and handled cleanly', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    const refusalDossier: Dossier = {
      ...mockDossier,
      refusal: {
        code: 'INSUFFICIENT_EVIDENCE',
        reason: 'Insufficient candle history for regime classification',
      },
    };

    const refusalNarration =
      'The desk could not complete the stress analysis due to insufficient candle history for regime classification. Position parameters should be reviewed with observed market data.';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: refusalNarration,
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: refusalDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: refusalNarration,
    });
  });

  it('Sends max_tokens 600 in LLM completion request body', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    const capturedPayloads: Array<{ max_tokens?: number }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      if (typeof init?.body === 'string') {
        capturedPayloads.push(
          JSON.parse(init.body) as { max_tokens?: number }
        );
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  'The desk classified the regime as trend_down with a worst historical gap of -16.2%. The outcome distribution shows 44% of 231 observed episodes closed up.',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(capturedPayloads.length).toBe(1);
    expect(capturedPayloads[0]?.max_tokens).toBe(600);
  });

  it('Returns llm_unavailable when reasoning model returns empty content but non-empty reasoning_content', async () => {
    process.env.GMI_API_KEY = 'gmi_test_secret_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'length',
              message: {
                content: '   ',
                reasoning_content: 'Thinking step by step about the dossier parameters...',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const req = new Request('http://localhost:3000/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier: mockDossier }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      narration: null,
      reason: 'llm_unavailable',
    });
  });

  describe('extractAllowedNumbers & validateNarrationNumbers helper units', () => {
    it('correctly collects numbers and toFixed variants from payload', () => {
      const payload = {
        risks: { worstGapPct: -16.2, carry: 0.001314 },
        distribution: { sampleSize: 231, categories: [{ label: 'Closed up (> 1%)', pct: 44 }] },
      };

      const allowed = extractAllowedNumbers(payload);
      expect(allowed.has('231')).toBe(true);
      expect(allowed.has('44')).toBe(true);
      expect(allowed.has('-16.2')).toBe(true);
      expect(allowed.has('16.2')).toBe(true);
      expect(allowed.has('-16')).toBe(true);
      expect(allowed.has('1')).toBe(true);
      expect(allowed.has('27')).toBe(false);
      expect(allowed.has('99.9')).toBe(false);

      expect(validateNarrationNumbers('No numbers mentioned in this summary.', allowed)).toBe(true);
      expect(validateNarrationNumbers('Sample size was 231 and gap was -16.2%.', allowed)).toBe(true);
      expect(validateNarrationNumbers('Unexpected drop of 27% occurred.', allowed)).toBe(false);
    });
  });
});

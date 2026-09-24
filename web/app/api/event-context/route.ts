import { NextResponse } from 'next/server';
import {
  fetchEventContext,
  computeMondayReopen,
  type McpEventContext,
} from '@/src/data/mcp-client';
import { isReplayAllowlistedSymbol } from '@/src/data/live-market-snapshot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'unsupported_symbol' },
        { status: 400 }
      );
    }

    const rawSymbol =
      body &&
      typeof body === 'object' &&
      'symbol' in body &&
      typeof (body as { symbol: unknown }).symbol === 'string'
        ? (body as { symbol: string }).symbol
        : '';

    const cleanSymbol = rawSymbol
      .replace(/^[$#]/, '')
      .replace(/^r/i, '')
      .replace(/USDT$/i, '')
      .trim()
      .toUpperCase();

    if (!cleanSymbol || !isReplayAllowlistedSymbol(cleanSymbol)) {
      return NextResponse.json(
        { ok: false, reason: 'unsupported_symbol' },
        { status: 400 }
      );
    }

    const mondayReopen = computeMondayReopen();
    const event: McpEventContext = await fetchEventContext(
      cleanSymbol,
      mondayReopen
    );

    return NextResponse.json({
      ok: true,
      event,
    });
  } catch (err: unknown) {
    const reason =
      err instanceof Error ? err.message : 'Internal failure';
    return NextResponse.json(
      { ok: false, reason },
      { status: 200 }
    );
  }
}

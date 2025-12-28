import { NextResponse } from 'next/server';
import { priceFeed, INSTRUMENTS, ALL_SYMBOLS } from '@/domains/trading/services/price-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let brokerSymbols: string[] = [];
    try {
      await priceFeed.initialize();
      brokerSymbols = priceFeed.getAvailableSymbols();
    } catch (e) {
      console.warn('[API] Could not get broker symbols');
    }

    const categories: Record<string, number> = {
      forex: INSTRUMENTS.forex?.length || 0,
      crypto: INSTRUMENTS.crypto?.length || 0,
      commodities: INSTRUMENTS.commodities?.length || 0,
      indices: INSTRUMENTS.indices?.length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        total: ALL_SYMBOLS.length,
        categories,
        instruments: INSTRUMENTS,
        symbols: ALL_SYMBOLS,
        brokerSymbols,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Instruments error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get instruments',
    }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { priceFeed, INSTRUMENTS, ALL_SYMBOLS } from '@/domains/trading/services/price-feed';

// GET - Get all available trading instruments with categories
export async function GET() {
  try {
    // Initialize price feed to get broker's available symbols
    let brokerSymbols: string[] = [];
    try {
      await priceFeed.initialize();
      brokerSymbols = priceFeed.getAvailableSymbols();
    } catch (e) {
      console.warn('[API] Could not get broker symbols, using defaults');
    }

    return NextResponse.json({
      success: true,
      data: {
        instruments: INSTRUMENTS,
        all: ALL_SYMBOLS,
        brokerSymbols,
        categories: ['forex', 'crypto', 'commodities', 'indices'],
        total: ALL_SYMBOLS.length,
      },
    });
  } catch (error: any) {
    console.error('[API] Symbols error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get symbols',
    }, { status: 500 });
  }
}

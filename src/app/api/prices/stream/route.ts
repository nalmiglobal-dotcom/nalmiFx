import { NextResponse } from 'next/server';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Fast price streaming endpoint - optimized for real-time updates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    
    // Initialize price feed if not already
    if (!priceFeed.isInitialized()) {
      await priceFeed.initialize();
    }
    
    // Default to priority symbols if none specified
    const symbols = symbolsParam 
      ? symbolsParam.split(',') 
      : ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'ETHUSD'];
    
    // Get prices for all requested symbols
    const prices: Record<string, any> = {};
    
    for (const symbol of symbols) {
      const price = priceFeed.getPrice(symbol);
      if (price) {
        prices[symbol] = {
          bid: price.bid,
          ask: price.ask,
          spread: price.spread,
          time: price.time.getTime(),
        };
      }
    }
    
    // Return with cache headers to prevent browser caching
    return new NextResponse(JSON.stringify({
      success: true,
      prices,
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Price stream error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get prices' }, { status: 500 });
  }
}

// Enable edge runtime for faster response
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

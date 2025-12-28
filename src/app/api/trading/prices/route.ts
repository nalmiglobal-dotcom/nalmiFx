import { NextRequest, NextResponse } from 'next/server';
import { priceFeed, ALL_SYMBOLS, INSTRUMENTS } from '@/domains/trading/services/price-feed';

// GET - Get real-time prices from MetaAPI
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const category = searchParams.get('category');

    let symbols: string[] = [];

    if (symbolsParam) {
      symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);
    } else if (category) {
      // Get symbols by category
      const cat = category.toLowerCase();
      if (cat === 'forex') symbols = INSTRUMENTS.forex.map(i => i.symbol);
      else if (cat === 'crypto') symbols = INSTRUMENTS.crypto.map(i => i.symbol);
      else if (cat === 'commodities') symbols = INSTRUMENTS.commodities.map(i => i.symbol);
      else if (cat === 'indices') symbols = INSTRUMENTS.indices.map(i => i.symbol);
      else if (cat === 'stocks') symbols = INSTRUMENTS.stocks.map(i => i.symbol);
      else symbols = ALL_SYMBOLS.map(i => i.symbol);
    } else {
      // Default: return all symbols
      symbols = ALL_SYMBOLS.map(i => i.symbol);
    }

    // Get prices from MetaAPI
    const prices = await priceFeed.getPrices(symbols);

    // Merge with instrument metadata
    const data = prices.map(price => {
      const instrument = ALL_SYMBOLS.find(i => i.symbol === price.symbol);
      return {
        ...price,
        name: instrument?.name || price.symbol,
        icon: instrument?.icon || '📊',
      };
    });

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Prices error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get prices',
    }, { status: 500 });
  }
}

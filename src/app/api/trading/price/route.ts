import { NextRequest, NextResponse } from 'next/server';
import { priceFeed, ALL_SYMBOLS } from '@/domains/trading/services/price-feed';
import { connect } from '@/infrastructure/database';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';

// Get pip value for a symbol
function getPipValue(symbol: string): number {
  if (symbol.includes('JPY')) return 0.01;
  if (['XAUUSD', 'XAGUSD'].includes(symbol)) return 0.01;
  if (['BTCUSD', 'ETHUSD'].includes(symbol)) return 1;
  if (['US30', 'US100', 'NAS100', 'US500', 'DE40'].includes(symbol)) return 1;
  return 0.0001;
}

// GET - Get real-time price for a single symbol from MetaAPI with spread applied
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({
        success: false,
        message: 'Symbol is required',
      }, { status: 400 });
    }

    // Get price from cache or fetch from MetaAPI
    const price = await priceFeed.getPriceAsync(symbol);

    if (!price) {
      return NextResponse.json({
        success: false,
        message: `Price not available for ${symbol}`,
      }, { status: 404 });
    }

    // Get trading settings for spread
    await connect();
    const tradingSettings = await TradingSettings.findOne({ isActive: true }).lean();
    
    // Calculate spread to apply
    let spreadPips = tradingSettings?.globalSpreadPips || 0;
    const instrumentSpread = tradingSettings?.instrumentSpreads?.find(
      (s: any) => s.symbol === symbol && s.enabled
    );
    if (instrumentSpread) {
      spreadPips = instrumentSpread.spreadPips;
    }
    
    // Apply spread to prices
    const pipValue = getPipValue(symbol);
    const spreadAmount = spreadPips * pipValue;
    const adjustedBid = price.bid - (spreadAmount / 2);
    const adjustedAsk = price.ask + (spreadAmount / 2);

    // Get instrument metadata
    const instrument = ALL_SYMBOLS.find(i => i.symbol === symbol);

    return NextResponse.json({
      success: true,
      data: {
        ...price,
        bid: adjustedBid,
        ask: adjustedAsk,
        rawBid: price.bid,
        rawAsk: price.ask,
        spreadPips,
        name: instrument?.name || symbol,
        icon: instrument?.icon || '📊',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Price error:', error.message);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get price',
    }, { status: 500 });
  }
}

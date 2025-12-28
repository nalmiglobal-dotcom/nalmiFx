import { NextRequest, NextResponse } from 'next/server';
import { priceFeed } from '@/domains/trading/services/price-feed';

export const runtime = 'nodejs';

const METAAPI_TOKEN = process.env.METAAPI_TOKEN || '';
const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || '';
const METAAPI_BASE_URL = 'https://mt-client-api-v1.new-york.agiliumtrade.ai';

function mapTimeframe(tf: string): string {
  const t = tf.toUpperCase();
  if (t === 'M1' || t === '1' || t === '1M') return '1m';
  if (t === 'M5' || t === '5' || t === '5M') return '5m';
  if (t === 'M15' || t === '15' || t === '15M') return '15m';
  if (t === 'M30' || t === '30' || t === '30M') return '30m';
  if (t === 'H1' || t === '60' || t === '1H') return '1h';
  if (t === 'H4' || t === '240' || t === '4H') return '4h';
  if (t === 'D1' || t === 'D' || t === '1D') return '1d';
  if (t === 'W1' || t === 'W' || t === '1W') return '1w';
  if (t === 'MN' || t === 'MN1') return '1mn';
  return '1h';
}

function getIntervalMs(tf: string): number {
  const t = tf.toUpperCase();
  if (t === 'M1' || t === '1' || t === '1M') return 60 * 1000;
  if (t === 'M5' || t === '5' || t === '5M') return 5 * 60 * 1000;
  if (t === 'M15' || t === '15' || t === '15M') return 15 * 60 * 1000;
  if (t === 'M30' || t === '30' || t === '30M') return 30 * 60 * 1000;
  if (t === 'H1' || t === '60' || t === '1H') return 60 * 60 * 1000;
  if (t === 'H4' || t === '240' || t === '4H') return 4 * 60 * 60 * 1000;
  if (t === 'D1' || t === 'D' || t === '1D') return 24 * 60 * 60 * 1000;
  return 60 * 1000;
}

// Generate realistic historical candles based on current price
function generateHistoricalCandles(symbol: string, currentPrice: number, timeframe: string, limit: number): any[] {
  const intervalMs = getIntervalMs(timeframe);
  const now = Date.now();
  const candles: any[] = [];
  
  // Determine volatility based on symbol type
  let volatility = 0.0005; // Default forex
  if (symbol.includes('XAU') || symbol.includes('GOLD')) volatility = 0.002;
  else if (symbol.includes('XAG') || symbol.includes('SILVER')) volatility = 0.003;
  else if (symbol.includes('BTC')) volatility = 0.01;
  else if (symbol.includes('ETH') || symbol.includes('SOL')) volatility = 0.015;
  else if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('NAS') || symbol.includes('DE40')) volatility = 0.003;
  else if (symbol.includes('XTI') || symbol.includes('XBR') || symbol.includes('OIL')) volatility = 0.005;
  else if (symbol.includes('JPY')) volatility = 0.0008;
  
  let price = currentPrice;
  
  // Generate candles from past to present
  for (let i = limit - 1; i >= 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000);
    
    // Random walk with mean reversion towards current price
    const trend = (currentPrice - price) * 0.01; // Slight pull towards current
    const change = (Math.random() - 0.5) * 2 * volatility * price + trend;
    
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    
    candles.push({
      time,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(Math.random() * 1000) + 100,
    });
    
    price = close;
  }
  
  return candles;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || 'XAUUSD').trim().toUpperCase();
    const timeframe = searchParams.get('timeframe') || searchParams.get('interval') || 'M1';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10) || 200, 1), 1000);

    // Get current price from price feed
    const priceData = priceFeed.getPrice(symbol);
    const currentPrice = priceData ? (priceData.bid + priceData.ask) / 2 : 0;

    // Try MetaAPI first if configured
    if (METAAPI_TOKEN && METAAPI_ACCOUNT_ID) {
      try {
        const metaApiTimeframe = mapTimeframe(timeframe);
        const url = `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/historical-market-data/symbols/${symbol}/timeframes/${metaApiTimeframe}/candles?limit=${limit}`;

        const res = await fetch(url, {
          headers: {
            'auth-token': METAAPI_TOKEN,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const candles = await res.json();
          
          if (Array.isArray(candles) && candles.length > 0) {
            const data = candles.map((c: any) => ({
              time: new Date(c.time).getTime() / 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.tickVolume || c.volume || 0,
            })).sort((a: any, b: any) => a.time - b.time);

            return NextResponse.json({
              success: true,
              data,
              meta: { symbol, timeframe, source: 'metaapi', count: data.length },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.log('[Candles API] MetaAPI failed, using generated data');
      }
    }

    // Fallback: Generate historical candles based on current price
    if (currentPrice > 0) {
      const data = generateHistoricalCandles(symbol, currentPrice, timeframe, limit);
      
      return NextResponse.json({
        success: true,
        data,
        meta: { symbol, timeframe, source: 'generated', count: data.length },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No price data available for symbol',
    }, { status: 404 });
  } catch (e: any) {
    console.error('[Candles API] Error:', e);
    return NextResponse.json({ success: false, message: e?.message || 'Server error' }, { status: 500 });
  }
}

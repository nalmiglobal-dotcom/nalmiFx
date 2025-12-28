import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = 'd543ld1r01qlj84akuvgd543ld1r01qlj84akv00';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Symbol mapping for Finnhub (forex uses OANDA format)
const SYMBOL_MAP: Record<string, { finnhub: string; type: 'forex' | 'crypto' | 'stock' }> = {
  'XAUUSD': { finnhub: 'OANDA:XAU_USD', type: 'forex' },
  'EURUSD': { finnhub: 'OANDA:EUR_USD', type: 'forex' },
  'GBPUSD': { finnhub: 'OANDA:GBP_USD', type: 'forex' },
  'USDJPY': { finnhub: 'OANDA:USD_JPY', type: 'forex' },
  'XAGUSD': { finnhub: 'OANDA:XAG_USD', type: 'forex' },
  'BTCUSD': { finnhub: 'BINANCE:BTCUSDT', type: 'crypto' },
  'ETHUSD': { finnhub: 'BINANCE:ETHUSDT', type: 'crypto' },
  'AAPL': { finnhub: 'AAPL', type: 'stock' },
  'GOOGL': { finnhub: 'GOOGL', type: 'stock' },
  'MSFT': { finnhub: 'MSFT', type: 'stock' },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'quote';
  const symbol = searchParams.get('symbol');

  try {
    if (action === 'quote' && symbol) {
      // Get quote for a symbol
      const mapping = SYMBOL_MAP[symbol.toUpperCase()];
      const finnhubSymbol = mapping?.finnhub || symbol;

      const response = await fetch(
        `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${FINNHUB_API_KEY}`,
        { next: { revalidate: 5 } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        quote: {
          symbol: symbol.toUpperCase(),
          current: data.c || 0,
          high: data.h || 0,
          low: data.l || 0,
          open: data.o || 0,
          previousClose: data.pc || 0,
          change: data.d || 0,
          changePercent: data.dp || 0,
          timestamp: data.t ? data.t * 1000 : Date.now(),
        },
      });
    }

    if (action === 'quotes') {
      // Get quotes for multiple symbols
      const symbols = searchParams.get('symbols')?.split(',') || Object.keys(SYMBOL_MAP);
      const quotes: any[] = [];

      for (const sym of symbols) {
        const mapping = SYMBOL_MAP[sym.toUpperCase()];
        const finnhubSymbol = mapping?.finnhub || sym;

        try {
          const response = await fetch(
            `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${FINNHUB_API_KEY}`,
            { next: { revalidate: 5 } }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.c) {
              quotes.push({
                symbol: sym.toUpperCase(),
                current: data.c,
                high: data.h,
                low: data.l,
                open: data.o,
                previousClose: data.pc,
                change: data.d || 0,
                changePercent: data.dp || 0,
              });
            }
          }
        } catch (e) {
          // Skip failed symbols
        }
      }

      return NextResponse.json({ success: true, quotes });
    }

    if (action === 'news') {
      // Get market news
      const category = searchParams.get('category') || 'general';
      
      const response = await fetch(
        `${FINNHUB_BASE_URL}/news?category=${category}&token=${FINNHUB_API_KEY}`,
        { next: { revalidate: 60 } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      
      // Return top 10 news items
      const news = (data || []).slice(0, 10).map((item: any) => ({
        id: item.id,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        image: item.image,
        datetime: item.datetime * 1000,
        category: item.category,
        related: item.related,
      }));

      return NextResponse.json({ success: true, news });
    }

    if (action === 'forex-news') {
      // Get forex-specific news
      const response = await fetch(
        `${FINNHUB_BASE_URL}/news?category=forex&token=${FINNHUB_API_KEY}`,
        { next: { revalidate: 60 } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch forex news');
      }

      const data = await response.json();
      const news = (data || []).slice(0, 10).map((item: any) => ({
        id: item.id,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        image: item.image,
        datetime: item.datetime * 1000,
        category: item.category,
      }));

      return NextResponse.json({ success: true, news });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Finnhub API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'API error' },
      { status: 500 }
    );
  }
}

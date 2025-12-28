import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import PendingOrder from '@/infrastructure/database/models/PendingOrder';
import Wallet from '@/infrastructure/database/models/Wallet';
import Trade from '@/infrastructure/database/models/Trade';
import { getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Fallback prices
const fallbackPrices: Record<string, { bid: number; ask: number }> = {
  XAUUSD: { bid: 4286.70, ask: 4287.12 },
  BTCUSD: { bid: 86204.00, ask: 86239.00 },
  EURUSD: { bid: 1.17505, ask: 1.17517 },
  ETHUSD: { bid: 2933.17, ask: 2936.19 },
  USDJPY: { bid: 154.842, ask: 154.866 },
  GBPUSD: { bid: 1.33614, ask: 1.33631 },
};

async function getPrice(symbol: string): Promise<{ bid: number; ask: number } | null> {
  try {
    await priceFeed.subscribe(symbol);
    const price = priceFeed.getPrice(symbol);
    if (price && price.bid && price.ask) {
      return { bid: price.bid, ask: price.ask };
    }
  } catch (e) {}
  return fallbackPrices[symbol] || null;
}

// GET - Fetch user's pending orders
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    await connect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const query: any = { userId: session.userId };
    if (status !== 'all') {
      query.status = status;
    }

    const orders = await PendingOrder.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching pending orders:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch pending orders' }, { status: 500 });
  }
}

// POST - Create pending order (limit/stop order)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    await connect();
    const body = await request.json();
    const { symbol, orderType, lot, triggerPrice, stopLoss, takeProfit, expiresAt } = body;

    // Validate inputs
    if (!symbol || !orderType || !lot || !triggerPrice) {
      return NextResponse.json(
        { success: false, message: 'Symbol, orderType, lot, and triggerPrice are required' },
        { status: 400 }
      );
    }

    if (!['buy_limit', 'sell_limit', 'buy_stop', 'sell_stop'].includes(orderType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid order type' },
        { status: 400 }
      );
    }

    if (lot < 0.01) {
      return NextResponse.json(
        { success: false, message: 'Lot size must be at least 0.01' },
        { status: 400 }
      );
    }

    // Determine side from order type
    const side = orderType.includes('buy') ? 'BUY' : 'SELL';

    // Get current price to validate trigger price
    const prices = await getPrice(symbol);
    if (!prices) {
      return NextResponse.json(
        { success: false, message: 'Price not available for this symbol' },
        { status: 400 }
      );
    }

    const currentPrice = side === 'BUY' ? prices.ask : prices.bid;

    // Validate trigger price based on order type
    if (orderType === 'buy_limit' && triggerPrice >= currentPrice) {
      return NextResponse.json(
        { success: false, message: 'Buy Limit price must be below current price' },
        { status: 400 }
      );
    }
    if (orderType === 'sell_limit' && triggerPrice <= currentPrice) {
      return NextResponse.json(
        { success: false, message: 'Sell Limit price must be above current price' },
        { status: 400 }
      );
    }
    if (orderType === 'buy_stop' && triggerPrice <= currentPrice) {
      return NextResponse.json(
        { success: false, message: 'Buy Stop price must be above current price' },
        { status: 400 }
      );
    }
    if (orderType === 'sell_stop' && triggerPrice >= currentPrice) {
      return NextResponse.json(
        { success: false, message: 'Sell Stop price must be below current price' },
        { status: 400 }
      );
    }

    // Validate Stop Loss relative to trigger price (entry price when executed)
    if (stopLoss !== undefined && stopLoss !== null && stopLoss > 0) {
      if (side === 'BUY' && stopLoss >= triggerPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be below trigger price for BUY orders' },
          { status: 400 }
        );
      }
      if (side === 'SELL' && stopLoss <= triggerPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be above trigger price for SELL orders' },
          { status: 400 }
        );
      }
    }

    // Validate Take Profit relative to trigger price (entry price when executed)
    if (takeProfit !== undefined && takeProfit !== null && takeProfit > 0) {
      if (side === 'BUY' && takeProfit <= triggerPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be above trigger price for BUY orders' },
          { status: 400 }
        );
      }
      if (side === 'SELL' && takeProfit >= triggerPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be below trigger price for SELL orders' },
          { status: 400 }
        );
      }
    }

    // Calculate margin
    const contractSize = getContractSize(symbol);
    const leverage = 100;
    const margin = (lot * contractSize * triggerPrice) / leverage;

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId: session.userId });
    if (!wallet) {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
    }

    // Calculate total margin used
    const openTrades = await Trade.find({ userId: session.userId, status: 'open' }).lean();
    const pendingOrders = await PendingOrder.find({ userId: session.userId, status: 'pending' }).lean();
    
    const totalMarginUsed = openTrades.reduce((sum, t: any) => sum + (t.margin || 0), 0);
    const pendingMargin = pendingOrders.reduce((sum, o: any) => sum + (o.margin || 0), 0);
    const freeMargin = wallet.equity - totalMarginUsed - pendingMargin;

    if (margin > freeMargin) {
      return NextResponse.json(
        { success: false, message: `Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create pending order
    const pendingOrder = new PendingOrder({
      userId: session.userId,
      symbol,
      orderType,
      side,
      lot,
      triggerPrice,
      stopLoss: stopLoss || undefined,
      takeProfit: takeProfit || undefined,
      status: 'pending',
      margin,
      leverage,
      contractSize,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    await pendingOrder.save();

    return NextResponse.json({
      success: true,
      message: `Pending order created: ${orderType.replace('_', ' ').toUpperCase()} ${lot} ${symbol} @ ${triggerPrice}`,
      order: pendingOrder,
    });
  } catch (error: any) {
    console.error('Error creating pending order:', error);
    return NextResponse.json({ success: false, message: 'Failed to create pending order' }, { status: 500 });
  }
}

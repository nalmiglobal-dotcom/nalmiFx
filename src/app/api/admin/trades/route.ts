import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import PendingOrder from '@/infrastructure/database/models/PendingOrder';
import Wallet from '@/infrastructure/database/models/Wallet';
import User from '@/infrastructure/database/models/User';
import { calculateFloatingPnL, calculateRealizedPnL, getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Fallback prices
const fallbackPrices: Record<string, { bid: number; ask: number }> = {
  XAUUSD: { bid: 4286.70, ask: 4287.12 },
  BTCUSD: { bid: 86204.00, ask: 86239.00 },
  EURUSD: { bid: 1.17505, ask: 1.17517 },
  ETHUSD: { bid: 2933.17, ask: 2936.19 },
  USDJPY: { bid: 154.842, ask: 154.866 },
  GBPUSD: { bid: 1.33614, ask: 1.33631 },
  NAS100: { bid: 24907.8, ask: 24910.7 },
  US30: { bid: 48348.3, ask: 48353.8 },
};

async function getPrice(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    await priceFeed.subscribe(symbol);
    const price = priceFeed.getPrice(symbol);
    if (price && price.bid && price.ask) {
      return { bid: price.bid, ask: price.ask };
    }
  } catch (e) {}
  return fallbackPrices[symbol] || { bid: 0, ask: 0 };
}

// GET - Fetch all trades (admin view with user info)
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await connect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId');
    const symbol = searchParams.get('symbol');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};
    if (status !== 'all') {
      if (status === 'open') query.status = 'open';
      else if (status === 'closed') query.status = { $in: ['closed', 'partial'] };
      else if (status === 'pending') query.status = 'pending';
    }
    if (userId) query.userId = parseInt(userId);
    if (symbol) query.symbol = symbol;

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {}

    const totalTrades = await Trade.countDocuments(query);
    const trades = await Trade.find(query)
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get user info for each trade
    const userIds = [...new Set(trades.map((t: any) => t.userId))];
    const users = await User.find({ userId: { $in: userIds } }).select('userId name email').lean();
    const userMap = new Map(users.map((u: any) => [u.userId, u]));

    // Calculate real-time PnL for open trades
    const tradesWithPnL = await Promise.all(trades.map(async (trade: any) => {
      const user = userMap.get(trade.userId);
      
      if (trade.status === 'open') {
        const prices = await getPrice(trade.symbol);
        const contractSize = getContractSize(trade.symbol);
        const remainingLot = trade.lot - (trade.closedLot || 0);
        
        const floatingPnL = calculateFloatingPnL(
          trade.side,
          trade.entryPrice,
          prices.bid,
          prices.ask,
          remainingLot,
          contractSize
        );

        return {
          ...trade,
          currentPrice: trade.side === 'BUY' ? prices.bid : prices.ask,
          floatingPnL: parseFloat(floatingPnL.toFixed(2)),
          user: user ? { name: user.name, email: user.email } : null,
        };
      }

      return {
        ...trade,
        user: user ? { name: user.name, email: user.email } : null,
      };
    }));

    // Also get pending orders
    const pendingQuery: any = { status: 'pending' };
    if (userId) pendingQuery.userId = parseInt(userId);
    if (symbol) pendingQuery.symbol = symbol;

    const pendingOrders = await PendingOrder.find(pendingQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get users for pending orders that might not be in trades
    const pendingUserIds = [...new Set(pendingOrders.map((o: any) => o.userId))];
    const allUserIds = [...new Set([...userIds, ...pendingUserIds])];
    const allUsers = await User.find({ userId: { $in: allUserIds } }).select('userId name email').lean();
    const allUserMap = new Map(allUsers.map((u: any) => [u.userId, u]));

    const pendingWithUsers = pendingOrders.map((order: any) => {
      const user = allUserMap.get(order.userId);
      return {
        ...order,
        user: user ? { name: user.name, email: user.email } : null,
      };
    });

    return NextResponse.json({
      success: true,
      trades: tradesWithPnL,
      pendingOrders: pendingWithUsers,
      pagination: {
        total: totalTrades,
        page,
        limit,
        pages: Math.ceil(totalTrades / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin trades:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch trades' }, { status: 500 });
  }
}

// POST - Admin create trade for user
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await connect();
    const body = await request.json();
    const { userId, symbol, side, lot, entryPrice, stopLoss, takeProfit, status: tradeStatus } = body;

    if (!userId || !symbol || !side || !lot || !entryPrice) {
      return NextResponse.json(
        { success: false, message: 'userId, symbol, side, lot, and entryPrice are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const contractSize = getContractSize(symbol);
    const leverage = 100;
    const margin = (lot * contractSize * entryPrice) / leverage;

    const trade = new Trade({
      userId,
      symbol,
      side: side.toUpperCase(),
      lot,
      entryPrice,
      currentPrice: entryPrice,
      stopLoss: stopLoss || undefined,
      takeProfit: takeProfit || undefined,
      status: tradeStatus || 'open',
      floatingPnL: 0,
      realizedPnL: 0,
      margin,
      leverage,
      contractSize,
    });

    await trade.save();

    return NextResponse.json({
      success: true,
      message: 'Trade created by admin',
      trade,
    });
  } catch (error: any) {
    console.error('Error creating admin trade:', error);
    return NextResponse.json({ success: false, message: 'Failed to create trade' }, { status: 500 });
  }
}

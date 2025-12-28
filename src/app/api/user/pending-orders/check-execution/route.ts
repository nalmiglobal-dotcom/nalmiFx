import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import PendingOrder from '@/infrastructure/database/models/PendingOrder';
import Trade from '@/infrastructure/database/models/Trade';
import Wallet from '@/infrastructure/database/models/Wallet';
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

// Check if pending order should execute
function shouldExecute(
  orderType: string,
  triggerPrice: number,
  currentBid: number,
  currentAsk: number
): boolean {
  switch (orderType) {
    case 'buy_limit':
      // Buy Limit: Execute when Ask <= trigger price (price dropped to our limit)
      return currentAsk <= triggerPrice;
    case 'sell_limit':
      // Sell Limit: Execute when Bid >= trigger price (price rose to our limit)
      return currentBid >= triggerPrice;
    case 'buy_stop':
      // Buy Stop: Execute when Ask >= trigger price (price rose to our stop)
      return currentAsk >= triggerPrice;
    case 'sell_stop':
      // Sell Stop: Execute when Bid <= trigger price (price dropped to our stop)
      return currentBid <= triggerPrice;
    default:
      return false;
  }
}

// POST - Check and execute pending orders
export async function POST(request: Request) {
  try {
    await connect();

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {}

    const pendingOrders = await PendingOrder.find({ status: 'pending' }).lean();
    const executedOrders: any[] = [];
    const expiredOrders: any[] = [];

    for (const order of pendingOrders) {
      // Check if order has expired
      if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
        await PendingOrder.findByIdAndUpdate(order._id, {
          status: 'expired',
          cancelledAt: new Date(),
          cancelReason: 'Order expired',
        });
        expiredOrders.push({ orderId: order._id, symbol: order.symbol });
        continue;
      }

      // Get current price
      const prices = await getPrice(order.symbol);
      if (!prices.bid || !prices.ask) continue;

      // Check if order should execute
      if (shouldExecute(order.orderType, order.triggerPrice, prices.bid, prices.ask)) {
        // Entry price based on side
        const entryPrice = order.side === 'BUY' ? prices.ask : prices.bid;

        // Check wallet balance again before execution
        const wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) continue;

        const openTrades = await Trade.find({ userId: order.userId, status: 'open' }).lean();
        const totalMarginUsed = openTrades.reduce((sum, t: any) => sum + (t.margin || 0), 0);
        const freeMargin = wallet.equity - totalMarginUsed;

        if (order.margin > freeMargin) {
          // Insufficient margin, cancel order
          await PendingOrder.findByIdAndUpdate(order._id, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: 'Insufficient margin at execution time',
          });
          continue;
        }

        // Create trade from pending order
        const contractSize = getContractSize(order.symbol);
        const trade = new Trade({
          userId: order.userId,
          accountId: order.accountId,
          symbol: order.symbol,
          side: order.side,
          lot: order.lot,
          entryPrice,
          currentPrice: entryPrice,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          status: 'open',
          floatingPnL: 0,
          realizedPnL: 0,
          margin: order.margin,
          leverage: order.leverage,
          contractSize,
        });

        await trade.save();

        // Update pending order status
        await PendingOrder.findByIdAndUpdate(order._id, {
          status: 'executed',
          executedAt: new Date(),
          executedTradeId: trade._id,
        });

        executedOrders.push({
          orderId: order._id,
          tradeId: trade._id,
          symbol: order.symbol,
          orderType: order.orderType,
          executionPrice: entryPrice,
          lot: order.lot,
        });
      }
    }

    return NextResponse.json({
      success: true,
      executedOrders,
      expiredOrders,
      message: executedOrders.length > 0
        ? `${executedOrders.length} pending order(s) executed`
        : 'No pending orders triggered',
    });
  } catch (error: any) {
    console.error('Error checking pending orders:', error);
    return NextResponse.json({ success: false, message: 'Failed to check pending orders' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Wallet from '@/infrastructure/database/models/Wallet';
import Trade from '@/infrastructure/database/models/Trade';
import { calculateFloatingPnL, getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Fallback prices if MetaAPI is not available - Updated Dec 2024
const fallbackPrices: Record<string, { bid: number; ask: number }> = {
  XAUUSD: { bid: 4489.00, ask: 4489.50 },
  BTCUSD: { bid: 96204.00, ask: 96239.00 },
  EURUSD: { bid: 1.04505, ask: 1.04517 },
  ETHUSD: { bid: 3433.17, ask: 3436.19 },
  USDJPY: { bid: 156.842, ask: 156.866 },
  GBPUSD: { bid: 1.25614, ask: 1.25631 },
  NAS100: { bid: 21907.8, ask: 21910.7 },
  US30: { bid: 43348.3, ask: 43353.8 },
  GBPJPY: { bid: 196.907, ask: 196.937 },
  XTIUSD: { bid: 69.20, ask: 69.28 },
  AUDUSD: { bid: 0.62331, ask: 0.62350 },
  XAGUSD: { bid: 29.245, ask: 29.267 },
  SOLUSD: { bid: 185.32, ask: 185.78 },
  NZDUSD: { bid: 0.56112, ask: 0.56130 },
  USDCAD: { bid: 1.43542, ask: 1.43560 },
};

// MetaAPI Configuration
const METAAPI_TOKEN = process.env.METAAPI_TOKEN || '';
const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || '5fa758ec-b241-4c97-81c4-9de3a3bc1f04';
const METAAPI_BASE_URL = 'https://mt-client-api-v1.new-york.agiliumtrade.ai';

// Get real-time price from MetaAPI directly
async function getPrice(symbol: string): Promise<{ bid: number; ask: number }> {
  // First try to get from price feed cache
  try {
    const price = priceFeed.getPrice(symbol);
    if (price && price.bid && price.ask) {
      return { bid: price.bid, ask: price.ask };
    }
  } catch (e) {}

  // Try direct MetaAPI call
  if (METAAPI_TOKEN && METAAPI_ACCOUNT_ID) {
    try {
      const url = `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`;
      const res = await fetch(url, {
        headers: {
          'auth-token': METAAPI_TOKEN,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bid && data.ask) {
          return { bid: data.bid, ask: data.ask };
        }
      }
    } catch (e) {}
  }
  
  return fallbackPrices[symbol] || { bid: 0, ask: 0 };
}

// GET - Fetch wallet with updated equity
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();

    let wallet = await Wallet.findOne({ userId: session.userId });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = new Wallet({
        userId: session.userId,
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        marginLevel: 0,
        floatingProfit: 0,
      });
      await wallet.save();
    }

    // Calculate floating PnL from open trades using real-time prices
    const openTrades = await Trade.find({ userId: session.userId, status: 'open' }).lean();
    let totalFloatingPnL = 0;
    let totalMarginUsed = 0;
    let totalCharges = 0;

    for (const trade of openTrades) {
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

      totalFloatingPnL += floatingPnL;
      totalMarginUsed += trade.margin || 0;
      totalCharges += trade.totalCharges || 0;
    }

    // Update wallet calculations
    const equity = wallet.balance + totalFloatingPnL;
    const freeMargin = equity - totalMarginUsed;
    const marginLevel = totalMarginUsed > 0 ? (equity / totalMarginUsed) * 100 : 0;

    // ===== AUTO SQUARE-OFF CHECK =====
    // If equity <= 0 or margin level < 50%, close ALL trades immediately
    const STOP_OUT_LEVEL = 50;
    let autoClosedTrades: any[] = [];
    
    if ((equity <= 0 || (marginLevel < STOP_OUT_LEVEL && totalMarginUsed > 0)) && openTrades.length > 0) {
      console.log(`[AUTO SQUARE-OFF] User ${session.userId}: Equity ${equity.toFixed(2)}, Margin Level ${marginLevel.toFixed(2)}%`);
      
      // Close all open trades
      for (const trade of openTrades) {
        const prices = await getPrice(trade.symbol);
        if (!prices.bid || !prices.ask) continue;
        
        const closePrice = trade.side === 'BUY' ? prices.bid : prices.ask;
        const remainingLot = trade.lot - (trade.closedLot || 0);
        const contractSize = getContractSize(trade.symbol);
        
        // Calculate P&L
        let realizedPnL = 0;
        if (trade.side === 'BUY') {
          realizedPnL = (closePrice - trade.entryPrice) * remainingLot * contractSize;
        } else {
          realizedPnL = (trade.entryPrice - closePrice) * remainingLot * contractSize;
        }
        
        const marginToReturn = trade.margin || 0;
        
        // Cap loss so wallet doesn't go below 0
        const maxAllowableLoss = wallet.balance + marginToReturn;
        if (realizedPnL < 0 && Math.abs(realizedPnL) > maxAllowableLoss) {
          realizedPnL = -maxAllowableLoss;
        }
        
        // Return margin + apply capped P&L
        wallet.balance += marginToReturn + realizedPnL;
        if (wallet.balance < 0) wallet.balance = 0;
        
        // Close the trade
        await Trade.findByIdAndUpdate(trade._id, {
          status: 'closed',
          closePrice,
          closedLot: trade.lot,
          realizedPnL: (trade.realizedPnL || 0) + realizedPnL,
          closedAt: new Date(),
        });
        
        autoClosedTrades.push({
          tradeId: trade._id,
          symbol: trade.symbol,
          realizedPnL: parseFloat(realizedPnL.toFixed(2)),
        });
      }
      
      // Reset wallet after closing all trades
      wallet.equity = wallet.balance;
      wallet.margin = 0;
      wallet.freeMargin = wallet.balance;
      wallet.marginLevel = 0;
      wallet.floatingProfit = 0;
      await wallet.save();
      
      return NextResponse.json({
        success: true,
        wallet: {
          balance: parseFloat(wallet.balance.toFixed(2)),
          equity: parseFloat(wallet.balance.toFixed(2)),
          margin: 0,
          freeMargin: parseFloat(wallet.balance.toFixed(2)),
          marginLevel: 0,
          floatingProfit: 0,
          totalCharges: parseFloat(totalCharges.toFixed(2)),
        },
        autoSquareOff: true,
        closedTrades: autoClosedTrades,
        message: `Auto square-off triggered. ${autoClosedTrades.length} trade(s) closed.`,
      });
    }

    // Normal wallet update (no auto square-off needed)
    wallet.equity = equity;
    wallet.floatingProfit = totalFloatingPnL;
    wallet.margin = totalMarginUsed;
    wallet.freeMargin = freeMargin;
    wallet.marginLevel = marginLevel;
    await wallet.save();

    return NextResponse.json({
      success: true,
      wallet: {
        balance: parseFloat(wallet.balance.toFixed(2)),
        equity: parseFloat(equity.toFixed(2)),
        margin: parseFloat(totalMarginUsed.toFixed(2)),
        freeMargin: parseFloat(freeMargin.toFixed(2)),
        marginLevel: parseFloat(marginLevel.toFixed(2)),
        floatingProfit: parseFloat(totalFloatingPnL.toFixed(2)),
        totalCharges: parseFloat(totalCharges.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}

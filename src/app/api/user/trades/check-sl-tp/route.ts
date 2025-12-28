import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import Wallet from '@/infrastructure/database/models/Wallet';
import { shouldTriggerSLTP, calculateRealizedPnL, getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Fallback prices - Updated Dec 2024
const fallbackPrices: Record<string, { bid: number; ask: number }> = {
  XAUUSD: { bid: 2620.00, ask: 2620.50 },
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

// Get price for SL/TP checks - tries MetaAPI first, then cached prices
async function getPrice(symbol: string): Promise<{ bid: number; ask: number } | null> {
  // Try direct MetaAPI call first
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
          priceFeed.updatePrice(symbol, data.bid, data.ask);
          return { bid: data.bid, ask: data.ask };
        }
      }
    } catch (e) {
      // MetaAPI unavailable
    }
  }

  // Try price feed cache (from tick-engine)
  try {
    const cached = priceFeed.getPrice(symbol);
    if (cached && cached.bid && cached.ask) {
      const cacheAge = Date.now() - cached.time.getTime();
      if (cacheAge < 30000) { // Accept prices up to 30s old
        return { bid: cached.bid, ask: cached.ask };
      }
    }
  } catch (e) {}

  // Fallback prices
  const fallback = fallbackPrices[symbol];
  if (fallback) {
    return { bid: fallback.bid, ask: fallback.ask };
  }

  return null;
}

// Margin call threshold - close all trades when margin level falls below this
const STOP_OUT_LEVEL = 50; // 50% margin level triggers stop out

// Helper to close a trade and update wallet - ENSURES WALLET NEVER GOES NEGATIVE
async function closeTradeWithProtection(
  trade: any, 
  closePrice: number, 
  reason: string,
  wallet: any
): Promise<{ success: boolean; realizedPnL: number }> {
  const remainingLot = trade.lot - (trade.closedLot || 0);
  const contractSize = getContractSize(trade.symbol);
  
  let realizedPnL = calculateRealizedPnL(
    trade.side,
    trade.entryPrice,
    closePrice,
    remainingLot,
    contractSize
  );

  const marginToReturn = trade.margin || 0;
  
  // CRITICAL: Limit loss so wallet never goes below 0
  // Available for loss = current balance + margin being returned
  const maxAllowableLoss = wallet.balance + marginToReturn;
  if (realizedPnL < 0 && Math.abs(realizedPnL) > maxAllowableLoss) {
    // Cap the loss to what's available
    realizedPnL = -maxAllowableLoss;
  }

  // Update wallet: return margin + apply P&L (capped)
  wallet.balance += marginToReturn + realizedPnL;
  
  // Ensure balance is never negative (safety check)
  if (wallet.balance < 0) {
    wallet.balance = 0;
  }

  // Determine trading session
  const closeTime = new Date();
  const hour = closeTime.getUTCHours();
  let session: 'New York' | 'London' | 'Tokyo' | 'Sydney' | 'Other' = 'Other';
  if (hour >= 8 && hour < 16) session = 'London';
  else if (hour >= 13 && hour < 21) session = 'New York';
  else if (hour >= 0 && hour < 8) session = 'Tokyo';
  else if (hour >= 21 || hour < 2) session = 'Sydney';

  // Close trade
  await Trade.findByIdAndUpdate(trade._id, {
    status: 'closed',
    closePrice,
    closedLot: trade.lot,
    realizedPnL: (trade.realizedPnL || 0) + realizedPnL,
    closedAt: closeTime,
    session,
  });

  return { success: true, realizedPnL };
}

// POST - Check margin calls, SL/TP, and auto-square-off
export async function POST(request: Request) {
  try {
    await connect();

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {
      // Continue with fallback prices
    }

    const closedTrades: any[] = [];
    const marginCallTrades: any[] = [];

    // ===== STEP 1: CHECK MARGIN CALLS FOR ALL USERS WITH OPEN TRADES =====
    // Get all unique users with open trades
    const usersWithTrades = await Trade.distinct('userId', { status: 'open' });
    
    for (const userId of usersWithTrades) {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) continue;

      const userTrades = await Trade.find({ userId, status: 'open' }).lean();
      if (userTrades.length === 0) continue;

      // Calculate current equity and margin level with live prices
      let totalFloatingPnL = 0;
      let totalMargin = 0;
      const tradeData: any[] = [];

      for (const trade of userTrades) {
        const prices = await getPrice(trade.symbol);
        if (!prices || !prices.bid || !prices.ask) continue; // Skip if no real-time price

        const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask;
        const contractSize = getContractSize(trade.symbol);
        const remainingLot = trade.lot - (trade.closedLot || 0);
        
        const floatingPnL = calculateRealizedPnL(
          trade.side,
          trade.entryPrice,
          currentPrice,
          remainingLot,
          contractSize
        );

        totalFloatingPnL += floatingPnL;
        totalMargin += trade.margin || 0;
        tradeData.push({ trade, prices, currentPrice, floatingPnL });

        // Update trade's floating P&L
        await Trade.findByIdAndUpdate(trade._id, { 
          floatingPnL, 
          currentPrice 
        });
      }

      // Calculate equity and margin level
      const equity = wallet.balance + totalFloatingPnL;
      const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;

      // Update wallet with current values
      wallet.equity = equity;
      wallet.margin = totalMargin;
      wallet.freeMargin = equity - totalMargin;
      wallet.marginLevel = marginLevel;
      wallet.floatingProfit = totalFloatingPnL;

      // ===== MARGIN CALL CHECK =====
      // If margin level < stop out level OR equity <= 0, close ALL trades
      if ((marginLevel < STOP_OUT_LEVEL && totalMargin > 0) || equity <= 0) {
        console.log(`[MARGIN CALL] User ${userId}: Margin Level ${marginLevel.toFixed(2)}%, Equity: ${equity.toFixed(2)}`);
        
        // Close all trades for this user
        for (const { trade, currentPrice } of tradeData) {
          const result = await closeTradeWithProtection(
            trade,
            currentPrice,
            'MARGIN_CALL',
            wallet
          );

          marginCallTrades.push({
            tradeId: trade._id,
            symbol: trade.symbol,
            reason: 'MARGIN_CALL',
            realizedPnL: parseFloat(result.realizedPnL.toFixed(2)),
            closePrice: currentPrice,
          });
        }

        // Reset wallet margin tracking after closing all trades
        wallet.margin = 0;
        wallet.freeMargin = wallet.balance;
        wallet.equity = wallet.balance;
        wallet.marginLevel = 0;
        wallet.floatingProfit = 0;
      }

      await wallet.save();
    }

    // ===== STEP 2: CHECK SL/TP FOR REMAINING OPEN TRADES =====
    const openTrades = await Trade.find({ status: 'open' }).lean();

    for (const trade of openTrades) {
      const prices = await getPrice(trade.symbol);
      if (!prices || !prices.bid || !prices.ask) continue; // Skip if no real-time price
      
      const checkResult = shouldTriggerSLTP(
        trade.side,
        prices.bid,
        prices.ask,
        trade.stopLoss,
        trade.takeProfit
      );

      if (checkResult.triggered) {
        const wallet = await Wallet.findOne({ userId: trade.userId });
        if (!wallet) continue;

        const result = await closeTradeWithProtection(
          trade,
          checkResult.closePrice,
          checkResult.reason || 'SL_TP',
          wallet
        );

        // Recalculate wallet after this trade closes
        const remainingOpenTrades = await Trade.find({ 
          userId: trade.userId, 
          status: 'open',
          _id: { $ne: trade._id }
        }).lean();
        
        const totalMarginUsed = remainingOpenTrades.reduce((sum: number, t: any) => sum + (t.margin || 0), 0);
        const floatingPnL = remainingOpenTrades.reduce((sum: number, t: any) => sum + (t.floatingPnL || 0), 0);
        
        wallet.equity = wallet.balance + floatingPnL;
        wallet.margin = totalMarginUsed;
        wallet.freeMargin = wallet.equity - totalMarginUsed;
        wallet.marginLevel = totalMarginUsed > 0 ? (wallet.equity / totalMarginUsed) * 100 : 0;
        await wallet.save();

        closedTrades.push({
          tradeId: trade._id,
          symbol: trade.symbol,
          reason: checkResult.reason,
          realizedPnL: parseFloat(result.realizedPnL.toFixed(2)),
          closePrice: checkResult.closePrice,
        });
      }
    }

    const allClosedTrades = [...marginCallTrades, ...closedTrades];

    return NextResponse.json({
      success: true,
      closedTrades: allClosedTrades,
      marginCalls: marginCallTrades.length,
      message: allClosedTrades.length > 0 
        ? `${allClosedTrades.length} trade(s) closed (${marginCallTrades.length} margin calls)`
        : 'No trades triggered',
    });
  } catch (error: any) {
    console.error('Error checking SL/TP:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check SL/TP' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import Wallet from '@/infrastructure/database/models/Wallet';
import { calculateRealizedPnL, getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';
import mongoose from 'mongoose';

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

// Get price for trade close - tries MetaAPI first, then cached prices
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
      console.log('[Trade Close] MetaAPI unavailable, trying cache');
    }
  }

  // Try price feed cache (from tick-engine or previous fetches)
  try {
    const cached = priceFeed.getPrice(symbol);
    if (cached && cached.bid && cached.ask) {
      const cacheAge = Date.now() - cached.time.getTime();
      if (cacheAge < 60000) { // Accept prices up to 60s old for closing
        return { bid: cached.bid, ask: cached.ask };
      }
    }
  } catch (e) {}

  // Last resort: fallback prices
  const fallback = fallbackPrices[symbol];
  if (fallback) {
    return { bid: fallback.bid, ask: fallback.ask };
  }

  return null;
}

// PUT - Close trade (full or partial) with REAL prices
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const { id } = await params;
    const body = await request.json();
    const { closeLot } = body; // Optional: for partial close

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    const trade = await Trade.findById(id);

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    if (trade.userId !== session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (trade.status === 'closed') {
      return NextResponse.json(
        { success: false, message: 'Trade is already closed' },
        { status: 400 }
      );
    }

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {
      // Continue with fallback prices
    }

    // Get REAL prices from MetaAPI - REQUIRED
    const prices = await getPrice(trade.symbol);
    if (!prices) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Market data feed not connected. Cannot close trade without real-time prices.',
          error: 'NO_LIVE_FEED'
        },
        { status: 503 }
      );
    }
    const closePrice = trade.side === 'BUY' ? prices.bid : prices.ask;

    // Determine lot to close
    const remainingLot = trade.lot - (trade.closedLot || 0);
    const lotToClose = closeLot && closeLot < remainingLot ? closeLot : remainingLot;
    const isPartialClose = lotToClose < remainingLot;

    if (lotToClose <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid lot size to close' },
        { status: 400 }
      );
    }

    // Calculate realized PnL with real close price
    const contractSize = getContractSize(trade.symbol);
    const realizedPnL = calculateRealizedPnL(
      trade.side,
      trade.entryPrice,
      closePrice,
      lotToClose,
      contractSize
    );

    // Calculate margin to return (proportional to lot closed)
    const marginToReturn = (trade.margin / trade.lot) * lotToClose;

    // Check if this is a challenge account trade
    let challengeAccount: any = null;
    if (trade.challengeAccountId) {
      const ChallengeAccount = (await import('@/infrastructure/database/models/ChallengeAccount')).default;
      challengeAccount = await ChallengeAccount.findById(trade.challengeAccountId);
    }

    // Update balance: return margin + apply P&L
    if (challengeAccount) {
      // Challenge account trade - only return margin here
      // The trade-update API will handle P&L, breach detection, and phase progression
      challengeAccount.currentBalance += marginToReturn;
      challengeAccount.lastActivityDate = new Date();
      
      // Safety check
      if (challengeAccount.currentBalance < 0) {
        challengeAccount.currentBalance = 0;
      }
      
      await challengeAccount.save();
      
      // Trigger challenge trade update for P&L, phase progression, and breach detection
      try {
        const tradeUpdateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/challenges/trade-update`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            challengeId: challengeAccount._id.toString(),
            trade: {
              _id: trade._id.toString(),
              symbol: trade.symbol,
              type: 'market',
              side: trade.side.toLowerCase(),
              lots: lotToClose,
              openPrice: trade.entryPrice,
              closePrice: closePrice,
              profit: realizedPnL,
              openedAt: trade.createdAt,
              closedAt: new Date(),
            },
          }),
        });
        
        const updateResult = await tradeUpdateResponse.json();
        console.log('[Trade Close] Challenge update result:', updateResult);
        
        // If challenge was breached, log it
        if (updateResult.breached) {
          console.log(`[Trade Close] Challenge BREACHED: ${updateResult.message}`);
        }
      } catch (e) {
        console.error('Failed to trigger challenge trade update:', e);
      }
    } else {
      // Regular wallet trade
      const wallet = await Wallet.findOne({ userId: session.userId });
      if (wallet) {
        // CRITICAL: Limit loss so wallet never goes below 0
        const maxAllowableLoss = wallet.balance + marginToReturn;
        let cappedPnL = realizedPnL;
        if (realizedPnL < 0 && Math.abs(realizedPnL) > maxAllowableLoss) {
          cappedPnL = -maxAllowableLoss;
        }
        
        // Return margin and add/subtract P&L (capped)
        wallet.balance += marginToReturn + cappedPnL;
        
        // Safety check - ensure balance never goes negative
        if (wallet.balance < 0) {
          wallet.balance = 0;
        }
        
        // Update margin tracking
        const openTrades = await Trade.find({ 
          userId: session.userId, 
          status: 'open',
          challengeAccountId: { $exists: false },
          _id: { $ne: trade._id } // Exclude current trade being closed
        }).lean();
        
        // For partial close, add remaining margin of this trade
        let totalMarginUsed = openTrades.reduce((sum, t: any) => sum + (t.margin || 0), 0);
        if (lotToClose < remainingLot) {
          // Partial close - remaining margin stays locked
          const remainingMargin = trade.margin - marginToReturn;
          totalMarginUsed += remainingMargin;
        }
        
        const floatingPnL = openTrades.reduce((sum, t: any) => sum + (t.floatingPnL || 0), 0);
        const equity = wallet.balance + floatingPnL;
        const freeMargin = equity - totalMarginUsed;
        const marginLevel = totalMarginUsed > 0 ? (equity / totalMarginUsed) * 100 : 0;
        
        wallet.equity = equity;
        wallet.margin = totalMarginUsed;
        wallet.freeMargin = freeMargin;
        wallet.marginLevel = marginLevel;
        await wallet.save();
      }
    }

    // Update trade
    const newRealizedPnL = (trade.realizedPnL || 0) + realizedPnL;
    const newClosedLot = (trade.closedLot || 0) + lotToClose;

    // Determine trading session
    const closeTime = new Date();
    const hour = closeTime.getUTCHours();
    let tradingSession: 'New York' | 'London' | 'Tokyo' | 'Sydney' | 'Other' = 'Other';
    if (hour >= 8 && hour < 16) tradingSession = 'London';
    else if (hour >= 13 && hour < 21) tradingSession = 'New York';
    else if (hour >= 0 && hour < 8) tradingSession = 'Tokyo';
    else if (hour >= 21 || hour < 2) tradingSession = 'Sydney';

    if (isPartialClose) {
      trade.status = 'partial';
      trade.closedLot = newClosedLot;
      trade.realizedPnL = newRealizedPnL;
      trade.closePrice = closePrice;
    } else {
      trade.status = 'closed';
      trade.closedLot = trade.lot;
      trade.realizedPnL = newRealizedPnL;
      trade.closePrice = closePrice;
      trade.closedAt = closeTime;
      trade.session = tradingSession;
    }

    await trade.save();

    return NextResponse.json({
      success: true,
      message: isPartialClose 
        ? `Partial close: ${lotToClose} lots @ ${closePrice.toFixed(5)}`
        : `Trade closed @ ${closePrice.toFixed(5)}`,
      trade,
      realizedPnL: parseFloat(realizedPnL.toFixed(2)),
      closePrice,
    });
  } catch (error: any) {
    console.error('Error closing trade:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to close trade' },
      { status: 500 }
    );
  }
}

// DELETE - Delete trade (for admin cleanup only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.role || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    const trade = await Trade.findByIdAndDelete(id);

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trade deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting trade:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete trade' },
      { status: 500 }
    );
  }
}

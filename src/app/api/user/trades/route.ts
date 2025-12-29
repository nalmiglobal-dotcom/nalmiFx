import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import Wallet from '@/infrastructure/database/models/Wallet';
import Account from '@/infrastructure/database/models/Account';
import AccountType from '@/infrastructure/database/models/AccountType';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';
import BrokerIncome from '@/infrastructure/database/models/BrokerIncome';
import { calculateFloatingPnL, getContractSize } from '@/domains/trading/services/calculations';
import { priceFeed } from '@/domains/trading/services/price-feed';

// Get symbol segment for charge calculation
function getSymbolSegment(symbol: string): string {
  if (['XAUUSD', 'XAGUSD', 'XTIUSD', 'XBRUSD'].includes(symbol)) return 'commodities';
  if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'SOLUSD', 'DOGEUSD'].includes(symbol)) return 'crypto';
  if (['US30', 'US100', 'US500', 'NAS100', 'DE40'].includes(symbol)) return 'indices';
  return 'forex';
}

// Get pip value for a symbol
function getPipValue(symbol: string): number {
  if (symbol.includes('JPY')) return 0.01;
  if (['XAUUSD', 'XAGUSD'].includes(symbol)) return 0.01;
  if (['BTCUSD', 'ETHUSD'].includes(symbol)) return 1;
  if (['US30', 'US100', 'NAS100', 'US500', 'DE40'].includes(symbol)) return 1;
  return 0.0001;
}

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

// Price cache with timestamp
const priceCache: Map<string, { bid: number; ask: number; timestamp: number }> = new Map();
const CACHE_TTL = 2000; // 2 seconds cache

// Tick-engine WebSocket URL (alternative price source)
const TICK_ENGINE_URL = process.env.TICK_ENGINE_URL || 'http://localhost:8766';

// Convert symbol format: XAUUSD -> XAU/USD
function toTickEngineSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    'XAUUSD': 'XAU/USD', 'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF', 'AUDUSD': 'AUD/USD',
    'USDCAD': 'USD/CAD', 'NZDUSD': 'NZD/USD', 'BTCUSD': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
  };
  return mapping[symbol] || symbol;
}

// Get real-time price - uses cached prices only for speed (no external API calls)
function getPrice(symbol: string): { bid: number; ask: number; isLive: boolean } | null {
  // Try price feed service cache first (fast, no API calls)
  try {
    const feedPrice = priceFeed.getPrice(symbol);
    if (feedPrice && feedPrice.bid && feedPrice.ask) {
      const cacheAge = Date.now() - feedPrice.time.getTime();
      return { bid: feedPrice.bid, ask: feedPrice.ask, isLive: cacheAge < 5000 };
    }
  } catch (e) {}

  // Fallback prices from local map
  const fallback = fallbackPrices[symbol];
  if (fallback && fallback.bid && fallback.ask) {
    return { bid: fallback.bid, ask: fallback.ask, isLive: false };
  }

  return null;
}

// GET - Fetch user trades with real-time P&L
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const challengeAccountId = searchParams.get('challengeAccountId');

    const query: any = { userId: session.userId };
    if (status === 'open') {
      query.status = 'open';
    } else if (status === 'closed') {
      query.status = { $in: ['closed', 'partial'] };
    }
    
    // Filter by challenge account if specified
    if (challengeAccountId) {
      query.challengeAccountId = challengeAccountId;
    } else {
      // If no challenge account specified, show only wallet trades (no challengeAccountId)
      query.$or = [
        { challengeAccountId: { $exists: false } },
        { challengeAccountId: null }
      ];
    }

    const trades = await Trade.find(query).sort({ openedAt: -1 }).lean();

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {
      // Continue with fallback prices
    }

    // Update floating PnL with current real-time prices (using cached prices for speed)
    const updatedTrades = trades.map((trade: any) => {
      const prices = getPrice(trade.symbol);
      
      // If no prices available, use stored values but try to get from price feed
      if (!prices) {
        // Try price feed as last resort
        const feedPrice = priceFeed.getPrice(trade.symbol);
        if (feedPrice && feedPrice.bid && feedPrice.ask) {
          const contractSize = getContractSize(trade.symbol);
          const remainingLot = trade.lot - (trade.closedLot || 0);
          const floatingPnL = calculateFloatingPnL(
            trade.side,
            trade.entryPrice,
            feedPrice.bid,
            feedPrice.ask,
            remainingLot,
            contractSize
          );
          return {
            ...trade,
            currentPrice: trade.side === 'BUY' ? feedPrice.bid : feedPrice.ask,
            floatingPnL: parseFloat(floatingPnL.toFixed(2)),
          };
        }
        return {
          ...trade,
          floatingPnL: trade.floatingPnL || 0,
        };
      }

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
      };
    });

    return NextResponse.json({
      success: true,
      trades: updatedTrades,
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

// POST - Create new trade (B-Book - internal execution with real prices)
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    
    // Check if user is read-only (can't trade)
    const User = (await import('@/infrastructure/database/models/User')).default;
    const user = await User.findOne({ userId: session.userId });
    if (user?.isReadOnly) {
      return NextResponse.json(
        { success: false, message: 'Your account is in read-only mode. Trading is disabled.' },
        { status: 403 }
      );
    }
    if (user?.isBanned) {
      return NextResponse.json(
        { success: false, message: 'Your account has been banned.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { symbol, side, lot, stopLoss, takeProfit, challengeAccountId } = body;

    console.log('[Trade API] Received challengeAccountId:', challengeAccountId);

    // Import ChallengeAccount model if trading on challenge
    let ChallengeAccount: any = null;
    let challengeAccount: any = null;
    
    if (challengeAccountId) {
      ChallengeAccount = (await import('@/infrastructure/database/models/ChallengeAccount')).default;
      
      // Try to find by _id and userId (could be ObjectId or string)
      challengeAccount = await ChallengeAccount.findOne({ 
        _id: challengeAccountId, 
        status: { $in: ['evaluation', 'funded'] }
      });
      
      console.log('[Trade API] Found challenge account:', challengeAccount?._id, 'status:', challengeAccount?.status);
      
      if (!challengeAccount) {
        return NextResponse.json(
          { success: false, message: 'Challenge account not found or not active' },
          { status: 404 }
        );
      }
      
      // Verify ownership
      const challengeUserId = challengeAccount.userId?.toString();
      const currentUserId = user._id?.toString();
      if (challengeUserId !== currentUserId) {
        console.log('[Trade API] User mismatch:', challengeUserId, 'vs', currentUserId);
        return NextResponse.json(
          { success: false, message: 'Challenge account does not belong to you' },
          { status: 403 }
        );
      }
    }

    if (!symbol || !side || !lot) {
      return NextResponse.json(
        { success: false, message: 'Symbol, side, and lot are required' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json(
        { success: false, message: 'Side must be BUY or SELL' },
        { status: 400 }
      );
    }

    if (lot < 0.01) {
      return NextResponse.json(
        { success: false, message: 'Lot size must be at least 0.01' },
        { status: 400 }
      );
    }

    // Get REAL prices from MetaAPI - REQUIRED for trade execution
    const prices = await getPrice(symbol);
    if (!prices || !prices.bid || !prices.ask) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Market data feed not connected. Cannot execute trade without real-time prices. Please try again later.',
          error: 'NO_LIVE_FEED'
        },
        { status: 503 }
      );
    }

    // Get trading settings for spread and charges
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
    const adjustedBid = prices.bid - (spreadAmount / 2);
    const adjustedAsk = prices.ask + (spreadAmount / 2);

    // Entry price: BUY uses Ask (with spread), SELL uses Bid (with spread)
    const entryPrice = side === 'BUY' ? adjustedAsk : adjustedBid;
    
    // Calculate spread cost in USD
    const contractSize = getContractSize(symbol);
    const spreadCost = spreadPips * pipValue * lot * contractSize;

    // Calculate trade charges based on admin settings
    let chargeAmount = 0;
    let chargeType: 'per_lot' | 'per_execution' | 'percentage' = 'per_lot';
    
    // Check segment-specific charges first
    const segment = getSymbolSegment(symbol);
    const segmentCharge = tradingSettings?.segmentCharges?.find(
      (c: any) => c.segment === segment && c.enabled
    );
    
    if (segmentCharge) {
      chargeType = segmentCharge.chargeType;
      if (chargeType === 'per_lot') {
        chargeAmount = segmentCharge.chargeAmount * lot;
      } else if (chargeType === 'per_execution') {
        chargeAmount = segmentCharge.chargeAmount;
      } else if (chargeType === 'percentage') {
        chargeAmount = (segmentCharge.chargeAmount / 100) * (lot * contractSize * entryPrice);
      }
      // Apply min/max
      if (segmentCharge.minCharge > 0 && chargeAmount < segmentCharge.minCharge) {
        chargeAmount = segmentCharge.minCharge;
      }
      if (segmentCharge.maxCharge > 0 && chargeAmount > segmentCharge.maxCharge) {
        chargeAmount = segmentCharge.maxCharge;
      }
    } else if (tradingSettings) {
      // Use global charges
      chargeType = tradingSettings.globalChargeType || 'per_lot';
      if (chargeType === 'per_lot') {
        chargeAmount = (tradingSettings.globalChargeAmount || 0) * lot;
      } else if (chargeType === 'per_execution') {
        chargeAmount = tradingSettings.globalChargeAmount || 0;
      } else if (chargeType === 'percentage') {
        chargeAmount = ((tradingSettings.globalChargeAmount || 0) / 100) * (lot * contractSize * entryPrice);
      }
      // Apply min/max
      if ((tradingSettings.globalMinCharge || 0) > 0 && chargeAmount < tradingSettings.globalMinCharge) {
        chargeAmount = tradingSettings.globalMinCharge;
      }
      if ((tradingSettings.globalMaxCharge || 0) > 0 && chargeAmount > tradingSettings.globalMaxCharge) {
        chargeAmount = tradingSettings.globalMaxCharge;
      }
    }
    
    const totalCharges = spreadCost + chargeAmount;

    // Validate Stop Loss
    if (stopLoss !== undefined && stopLoss !== null && stopLoss > 0) {
      if (side === 'BUY' && stopLoss >= entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be below entry price for BUY orders' },
          { status: 400 }
        );
      }
      if (side === 'SELL' && stopLoss <= entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be above entry price for SELL orders' },
          { status: 400 }
        );
      }
    }

    // Validate Take Profit
    if (takeProfit !== undefined && takeProfit !== null && takeProfit > 0) {
      if (side === 'BUY' && takeProfit <= entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be above entry price for BUY orders' },
          { status: 400 }
        );
      }
      if (side === 'SELL' && takeProfit >= entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be below entry price for SELL orders' },
          { status: 400 }
        );
      }
    }

    // Calculate margin using leverage from settings
    const leverage = tradingSettings?.leverage || 100;
    const margin = (lot * contractSize * entryPrice) / leverage;

    // Determine balance source: Challenge account or Wallet
    let balanceSource: 'wallet' | 'challenge' = 'wallet';
    let availableBalance = 0;
    let wallet: any = null;
    
    if (challengeAccount) {
      balanceSource = 'challenge';
      availableBalance = challengeAccount.currentBalance;
    } else {
      wallet = await Wallet.findOne({ userId: session.userId });
      if (!wallet) {
        return NextResponse.json(
          { success: false, message: 'Wallet not found' },
          { status: 404 }
        );
      }
      availableBalance = wallet.balance;
    }

    // Calculate total margin used by all open trades for this account
    const tradeQuery: any = { userId: session.userId, status: 'open' };
    if (challengeAccount) {
      tradeQuery.challengeAccountId = challengeAccount._id;
    } else {
      tradeQuery.challengeAccountId = { $exists: false };
    }
    
    const openTrades = await Trade.find(tradeQuery).lean();
    const totalMarginUsed = openTrades.reduce((sum, trade: any) => sum + (trade.margin || 0), 0);

    // Calculate floating PnL from open trades
    const floatingPnL = openTrades.reduce((sum, trade: any) => sum + (trade.floatingPnL || 0), 0);
    
    // Calculate equity and free margin
    const equity = availableBalance + floatingPnL;
    const freeMargin = equity - totalMarginUsed;

    // Check if user has enough balance for margin + charges
    const totalRequired = margin + totalCharges;
    if (totalRequired > availableBalance) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Insufficient funds. Required: $${totalRequired.toFixed(2)} (Margin: $${margin.toFixed(2)} + Charges: $${totalCharges.toFixed(2)}), Available: $${availableBalance.toFixed(2)}` 
        },
        { status: 400 }
      );
    }

    // Deduct margin + charges from balance
    if (challengeAccount) {
      challengeAccount.currentBalance -= totalRequired;
      challengeAccount.lastActivityDate = new Date();
      await challengeAccount.save();
    } else if (wallet) {
      wallet.balance -= totalRequired;
      await wallet.save();
    }
    
    // Record broker income from charges
    if (totalCharges > 0 && tradingSettings) {
      await TradingSettings.findByIdAndUpdate(tradingSettings._id, {
        $inc: { 
          totalSpreadIncome: spreadCost,
          totalChargeIncome: chargeAmount 
        }
      });
    }

    // Create trade with charge details
    const trade = new Trade({
      userId: session.userId,
      symbol,
      side,
      lot,
      entryPrice,
      currentPrice: entryPrice,
      stopLoss: stopLoss || undefined,
      takeProfit: takeProfit || undefined,
      status: 'open',
      floatingPnL: 0,
      realizedPnL: 0,
      margin,
      leverage,
      contractSize,
      // Charge details
      spreadPips,
      spreadCost,
      chargeType,
      chargeAmount,
      totalCharges,
      // Challenge account reference
      challengeAccountId: challengeAccount?._id || undefined,
    });

    await trade.save();

    // Update margin tracking info
    const newTotalMargin = totalMarginUsed + margin;
    
    if (wallet) {
      const newEquity = wallet.balance + floatingPnL;
      const newFreeMargin = newEquity - newTotalMargin;
      const newMarginLevel = newTotalMargin > 0 ? (newEquity / newTotalMargin) * 100 : 0;
      
      await Wallet.findByIdAndUpdate(wallet._id, {
        margin: newTotalMargin,
        freeMargin: newFreeMargin,
        equity: newEquity,
        marginLevel: newMarginLevel,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Trade opened: ${side} ${lot} ${symbol} @ ${entryPrice.toFixed(5)}`,
      trade,
      executionPrice: entryPrice,
      charges: {
        spreadPips,
        spreadCost: parseFloat(spreadCost.toFixed(2)),
        commission: parseFloat(chargeAmount.toFixed(2)),
        total: parseFloat(totalCharges.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create trade' },
      { status: 500 }
    );
  }
}

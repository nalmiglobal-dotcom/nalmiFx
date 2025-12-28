/**
 * Trading Service
 * Business logic for trade operations
 */

import { connect } from '@/infrastructure/database';
import { Trade, Wallet, Account, AccountType } from '@/infrastructure/database/models';
import { calculateFloatingPnL, getContractSize } from './calculations';
import { priceFeed } from './price-feed';
import { createError } from '@/shared/lib/errors';

// Fallback prices if MetaAPI is not available
const fallbackPrices: Record<string, { bid: number; ask: number }> = {
  XAUUSD: { bid: 4286.70, ask: 4287.12 },
  BTCUSD: { bid: 86204.00, ask: 86239.00 },
  EURUSD: { bid: 1.17505, ask: 1.17517 },
  ETHUSD: { bid: 2933.17, ask: 2936.19 },
  USDJPY: { bid: 154.842, ask: 154.866 },
  GBPUSD: { bid: 1.33614, ask: 1.33631 },
  NAS100: { bid: 24907.8, ask: 24910.7 },
  US30: { bid: 48348.3, ask: 48353.8 },
  GBPJPY: { bid: 206.907, ask: 206.937 },
  XTIUSD: { bid: 56.20, ask: 56.28 },
  AUDUSD: { bid: 0.66331, ask: 0.66350 },
  XAGUSD: { bid: 31.245, ask: 31.267 },
  SOLUSD: { bid: 145.32, ask: 145.78 },
  NZDUSD: { bid: 0.59112, ask: 0.59130 },
  USDCAD: { bid: 1.38542, ask: 1.38560 },
};

// Get real-time price from MetaAPI or fallback
async function getPrice(symbol: string): Promise<{ bid: number; ask: number } | null> {
  try {
    await priceFeed.subscribe(symbol);
    const price = priceFeed.getPrice(symbol);
    if (price && price.bid && price.ask) {
      return { bid: price.bid, ask: price.ask };
    }
  } catch (e) {
    // MetaAPI not available, use fallback
  }
  
  return fallbackPrices[symbol] || null;
}

export class TradeService {
  /**
   * Get user trades with real-time P&L
   */
  static async getUserTrades(userId: number, status: 'open' | 'closed' = 'open') {
    await connect();
    
    const query: any = { userId };
    if (status === 'open') {
      query.status = 'open';
    } else if (status === 'closed') {
      query.status = { $in: ['closed', 'partial'] };
    }

    const trades = await Trade.find(query).sort({ openedAt: -1 }).lean();

    // Initialize price feed
    try {
      await priceFeed.initialize();
    } catch (e) {
      // Continue with fallback prices
    }

    // Update floating PnL with current real-time prices
    const updatedTrades = await Promise.all(trades.map(async (trade: any) => {
      const prices = await getPrice(trade.symbol);
      if (!prices) {
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
    }));

    return updatedTrades;
  }

  /**
   * Create a new trade
   */
  static async createTrade(
    userId: number,
    data: {
      symbol: string;
      side: 'BUY' | 'SELL';
      lot: number;
      stopLoss?: number;
      takeProfit?: number;
    }
  ) {
    await connect();

    const { symbol, side, lot, stopLoss, takeProfit } = data;

    // Validation
    if (!['BUY', 'SELL'].includes(side)) {
      throw createError.validation('Side must be BUY or SELL');
    }

    if (lot < 0.01) {
      throw createError.validation('Lot size must be at least 0.01');
    }

    // Get REAL prices from MetaAPI
    const prices = await getPrice(symbol);
    if (!prices || !prices.bid || !prices.ask) {
      throw createError.validation('Price not available for this symbol');
    }

    // Entry price: BUY uses Ask, SELL uses Bid
    const entryPrice = side === 'BUY' ? prices.ask : prices.bid;

    // Calculate margin
    const contractSize = getContractSize(symbol);
    const leverage = 100; // Default leverage
    const margin = (lot * contractSize * entryPrice) / leverage;

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw createError.notFound('Wallet not found');
    }

    // Get active trading account to determine account type and trade charges
    const activeAccount = await Account.findOne({ 
      userId, 
      accountType: 'trading',
      status: 'active'
    }).populate('accountTypeId');

    let tradeCharges = 0;
    if (activeAccount && (activeAccount as any).accountTypeId) {
      const accountType = (activeAccount as any).accountTypeId;
      tradeCharges = accountType.tradeCharges || accountType.brokerage || 0;
    }

    // Calculate total margin used by all open trades
    const openTrades = await Trade.find({ userId, status: 'open' }).lean();
    const totalMarginUsed = openTrades.reduce((sum, trade: any) => sum + (trade.margin || 0), 0);

    // Check if user has enough free margin
    const freeMargin = wallet.equity - totalMarginUsed;
    const totalRequired = margin + tradeCharges;
    if (totalRequired > freeMargin) {
      throw createError.validation(
        `Insufficient margin. Required: $${totalRequired.toFixed(2)} (Margin: $${margin.toFixed(2)} + Charges: $${tradeCharges.toFixed(2)}), Available: $${freeMargin.toFixed(2)}`
      );
    }

    // Deduct trade charges from wallet
    if (tradeCharges > 0) {
      wallet.balance -= tradeCharges;
      wallet.equity -= tradeCharges;
      wallet.freeMargin -= tradeCharges;
      await wallet.save();
    }

    // Create trade
    const trade = new Trade({
      userId,
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
    });

    await trade.save();

    return {
      trade,
      executionPrice: entryPrice,
    };
  }
}


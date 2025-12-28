/**
 * Trading calculation utilities
 */

// Standard contract sizes for different instruments
export const CONTRACT_SIZES: Record<string, number> = {
  // Forex - standard 100,000 units per lot
  EURUSD: 100000,
  GBPUSD: 100000,
  USDJPY: 100000,
  AUDUSD: 100000,
  USDCAD: 100000,
  NZDUSD: 100000,
  // Metals - different contract sizes
  XAUUSD: 100, // Gold: 100 oz per lot
  XAGUSD: 5000, // Silver: 5000 oz per lot
  // Crypto - varies
  BTCUSD: 1, // Bitcoin: 1 BTC per lot
  ETHUSD: 1, // Ethereum: 1 ETH per lot
  // Indices - contract multiplier
  NAS100: 1,
  US30: 1,
};

// Default contract size for unknown instruments
const DEFAULT_CONTRACT_SIZE = 100000;

// Standard leverage
const DEFAULT_LEVERAGE = 100;

/**
 * Get contract size for a symbol
 */
export function getContractSize(symbol: string): number {
  return CONTRACT_SIZES[symbol] || DEFAULT_CONTRACT_SIZE;
}

/**
 * Calculate margin required for a trade
 */
export function calculateMargin(
  lot: number,
  price: number,
  contractSize: number,
  leverage: number = DEFAULT_LEVERAGE
): number {
  return (lot * contractSize * price) / leverage;
}

/**
 * Calculate floating PnL for a BUY trade
 */
export function calculateBuyPnL(
  entryPrice: number,
  currentBid: number,
  lot: number,
  contractSize: number
): number {
  return (currentBid - entryPrice) * lot * contractSize;
}

/**
 * Calculate floating PnL for a SELL trade
 */
export function calculateSellPnL(
  entryPrice: number,
  currentAsk: number,
  lot: number,
  contractSize: number
): number {
  return (entryPrice - currentAsk) * lot * contractSize;
}

/**
 * Calculate floating PnL based on trade side
 */
export function calculateFloatingPnL(
  side: 'BUY' | 'SELL',
  entryPrice: number,
  currentBid: number,
  currentAsk: number,
  lot: number,
  contractSize: number
): number {
  if (side === 'BUY') {
    return calculateBuyPnL(entryPrice, currentBid, lot, contractSize);
  } else {
    return calculateSellPnL(entryPrice, currentAsk, lot, contractSize);
  }
}

/**
 * Check if Stop Loss should trigger for BUY trade
 */
export function shouldTriggerBuySL(currentBid: number, stopLoss?: number): boolean {
  if (!stopLoss) return false;
  return currentBid <= stopLoss;
}

/**
 * Check if Take Profit should trigger for BUY trade
 */
export function shouldTriggerBuyTP(currentBid: number, takeProfit?: number): boolean {
  if (!takeProfit) return false;
  return currentBid >= takeProfit;
}

/**
 * Check if Stop Loss should trigger for SELL trade
 */
export function shouldTriggerSellSL(currentAsk: number, stopLoss?: number): boolean {
  if (!stopLoss) return false;
  return currentAsk >= stopLoss;
}

/**
 * Check if Take Profit should trigger for SELL trade
 */
export function shouldTriggerSellTP(currentAsk: number, takeProfit?: number): boolean {
  if (!takeProfit) return false;
  return currentAsk <= takeProfit;
}

/**
 * Check if SL/TP should trigger
 */
export function shouldTriggerSLTP(
  side: 'BUY' | 'SELL',
  currentBid: number,
  currentAsk: number,
  stopLoss?: number,
  takeProfit?: number
): { triggered: boolean; reason: 'SL' | 'TP' | null; closePrice: number } {
  if (side === 'BUY') {
    if (shouldTriggerBuySL(currentBid, stopLoss)) {
      return { triggered: true, reason: 'SL', closePrice: currentBid };
    }
    if (shouldTriggerBuyTP(currentBid, takeProfit)) {
      return { triggered: true, reason: 'TP', closePrice: currentBid };
    }
  } else {
    if (shouldTriggerSellSL(currentAsk, stopLoss)) {
      return { triggered: true, reason: 'SL', closePrice: currentAsk };
    }
    if (shouldTriggerSellTP(currentAsk, takeProfit)) {
      return { triggered: true, reason: 'TP', closePrice: currentAsk };
    }
  }
  return { triggered: false, reason: null, closePrice: 0 };
}

/**
 * Calculate realized PnL when closing a trade
 */
export function calculateRealizedPnL(
  side: 'BUY' | 'SELL',
  entryPrice: number,
  closePrice: number,
  lot: number,
  contractSize: number
): number {
  if (side === 'BUY') {
    return (closePrice - entryPrice) * lot * contractSize;
  } else {
    return (entryPrice - closePrice) * lot * contractSize;
  }
}

/**
 * Calculate margin level
 */
export function calculateMarginLevel(equity: number, margin: number): number {
  if (margin === 0) return 0;
  return (equity / margin) * 100;
}


import mongoose, { Schema, Document } from 'mongoose';

export interface ITrade extends Document {
  userId: number;
  accountId?: mongoose.Types.ObjectId; // Reference to Account (for trading accounts)
  challengeAccountId?: mongoose.Types.ObjectId; // Reference to ChallengeAccount
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'open' | 'closed' | 'partial';
  floatingPnL: number;
  realizedPnL: number;
  margin: number;
  leverage: number;
  contractSize: number;
  openedAt: Date;
  closedAt?: Date;
  closePrice?: number;
  closedLot?: number; // For partial closes
  session?: 'New York' | 'London' | 'Tokyo' | 'Sydney' | 'Other'; // Trading session
  // Charges and spread
  spreadPips?: number; // Spread applied to this trade
  spreadCost?: number; // Cost from spread in USD
  chargeType?: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount?: number; // Charge deducted from wallet
  totalCharges?: number; // Total charges (spread + commission)
}

const TradeSchema = new Schema<ITrade>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    challengeAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'ChallengeAccount',
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      index: true,
    },
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    lot: {
      type: Number,
      required: true,
      min: 0.01,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    stopLoss: {
      type: Number,
    },
    takeProfit: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'partial'],
      default: 'open',
      index: true,
    },
    floatingPnL: {
      type: Number,
      default: 0,
    },
    realizedPnL: {
      type: Number,
      default: 0,
    },
    margin: {
      type: Number,
      required: true,
    },
    leverage: {
      type: Number,
      default: 100,
    },
    contractSize: {
      type: Number,
      default: 100000, // Standard forex contract size
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    closePrice: {
      type: Number,
    },
    closedLot: {
      type: Number,
    },
    session: {
      type: String,
      enum: ['New York', 'London', 'Tokyo', 'Sydney', 'Other'],
    },
    // Charges and spread tracking
    spreadPips: {
      type: Number,
      default: 0,
    },
    spreadCost: {
      type: Number,
      default: 0,
    },
    chargeType: {
      type: String,
      enum: ['per_lot', 'per_execution', 'percentage'],
    },
    chargeAmount: {
      type: Number,
      default: 0,
    },
    totalCharges: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
TradeSchema.index({ userId: 1, status: 1 });
TradeSchema.index({ userId: 1, symbol: 1, status: 1 });
TradeSchema.index({ accountId: 1, status: 1 });
TradeSchema.index({ accountId: 1, closedAt: 1 });

export default mongoose.models.Trade || mongoose.model<ITrade>('Trade', TradeSchema);


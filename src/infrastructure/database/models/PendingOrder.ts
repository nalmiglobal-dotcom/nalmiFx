import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingOrder extends Document {
  userId: number;
  accountId?: mongoose.Types.ObjectId;
  symbol: string;
  orderType: 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  side: 'BUY' | 'SELL';
  lot: number;
  triggerPrice: number; // Price at which order should execute
  stopLoss?: number;
  takeProfit?: number;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
  margin: number;
  leverage: number;
  contractSize: number;
  createdAt: Date;
  expiresAt?: Date;
  executedAt?: Date;
  executedTradeId?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
}

const PendingOrderSchema = new Schema<IPendingOrder>(
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
    symbol: {
      type: String,
      required: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ['buy_limit', 'sell_limit', 'buy_stop', 'sell_stop'],
      required: true,
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
    triggerPrice: {
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
      enum: ['pending', 'executed', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
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
      default: 100000,
    },
    expiresAt: {
      type: Date,
    },
    executedAt: {
      type: Date,
    },
    executedTradeId: {
      type: Schema.Types.ObjectId,
      ref: 'Trade',
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

PendingOrderSchema.index({ userId: 1, status: 1 });
PendingOrderSchema.index({ symbol: 1, status: 1 });

export default mongoose.models.PendingOrder || mongoose.model<IPendingOrder>('PendingOrder', PendingOrderSchema);

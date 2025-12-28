import mongoose, { Schema, Document } from 'mongoose';

// User Wallet - Single wallet per user for all trading/challenge accounts
export interface IWallet extends Document {
  userId: number;
  balance: number;           // Available balance for deposits/withdrawals
  equity: number;            // Balance + floating P&L from all accounts
  margin: number;            // Total margin used across all accounts
  freeMargin: number;        // Equity - Margin
  marginLevel: number;       // (Equity / Margin) * 100
  floatingProfit: number;    // Total unrealized P&L from all accounts
  totalDeposits: number;
  totalWithdrawals: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    equity: {
      type: Number,
      default: 0,
    },
    margin: {
      type: Number,
      default: 0,
    },
    freeMargin: {
      type: Number,
      default: 0,
    },
    marginLevel: {
      type: Number,
      default: 0,
    },
    floatingProfit: {
      type: Number,
      default: 0,
    },
    totalDeposits: {
      type: Number,
      default: 0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);


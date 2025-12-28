import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminWalletTransaction {
  type: 'deposit' | 'withdrawal' | 'commission' | 'settlement' | 'fund_transfer';
  amount: number;
  fromAdminId?: number;
  toAdminId?: number;
  description: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: Date;
}

export interface IAdminWallet extends Document {
  adminId: number;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalCommissions: number;
  totalSettlements: number;
  totalFundsReceived: number; // Funds received from super admin
  totalFundsSent: number; // Funds sent to other admins (super admin only)
  currency: string;
  transactions: IAdminWalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const AdminWalletTransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'commission', 'settlement', 'fund_transfer'],
    required: true,
  },
  amount: { type: Number, required: true },
  fromAdminId: { type: Number },
  toAdminId: { type: Number },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'completed',
  },
  createdAt: { type: Date, default: Date.now },
});

const AdminWalletSchema = new Schema<IAdminWallet>(
  {
    adminId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
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
    totalCommissions: {
      type: Number,
      default: 0,
    },
    totalSettlements: {
      type: Number,
      default: 0,
    },
    totalFundsReceived: {
      type: Number,
      default: 0,
    },
    totalFundsSent: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    transactions: {
      type: [AdminWalletTransactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AdminWallet || mongoose.model<IAdminWallet>('AdminWallet', AdminWalletSchema);

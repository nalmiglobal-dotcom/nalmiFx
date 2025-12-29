import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: number;
  type: 'deposit' | 'withdrawal' | 'challenge_purchase' | 'challenge_payout';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: 'bank' | 'upi' | 'crypto' | 'paypal' | 'wallet';
  paymentMethodId?: mongoose.Types.ObjectId; // Reference to PaymentMethod
  accountTypeId?: mongoose.Types.ObjectId; // Reference to AccountType (for deposit validation)
  transactionId?: string; // Transaction ID/UTR number provided by user
  accountDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    cryptoAddress?: string;
    cryptoType?: string;
    paypalEmail?: string;
  };
  adminNotes?: string;
  processedBy?: number; // Admin userId
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'challenge_purchase', 'challenge_payout'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['bank', 'upi', 'crypto', 'paypal', 'wallet'],
      required: true,
    },
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
    },
    accountTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'AccountType',
    },
    transactionId: {
      type: String, // Transaction ID/UTR number
    },
    accountDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String,
      cryptoAddress: String,
      cryptoType: String,
      paypalEmail: String,
    },
    adminNotes: {
      type: String,
    },
    processedBy: {
      type: Number,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as any).Transaction;
}

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);


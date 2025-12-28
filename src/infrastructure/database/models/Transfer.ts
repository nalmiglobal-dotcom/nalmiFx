import mongoose, { Schema, Document } from 'mongoose';

export interface ITransfer extends Document {
  userId: number;
  fromType: 'wallet' | 'trading' | 'challenge';
  fromAccountId?: mongoose.Types.ObjectId; // null if from wallet
  toType: 'wallet' | 'trading' | 'challenge';
  toAccountId?: mongoose.Types.ObjectId; // null if to wallet
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  reason?: string; // Rejection reason
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    fromType: {
      type: String,
      enum: ['wallet', 'trading', 'challenge'],
      required: true,
    },
    fromAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    toType: {
      type: String,
      enum: ['wallet', 'trading', 'challenge'],
      required: true,
    },
    toAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

TransferSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Transfer || mongoose.model<ITransfer>('Transfer', TransferSchema);


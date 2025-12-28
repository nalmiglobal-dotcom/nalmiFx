import mongoose, { Schema, Document } from 'mongoose';

export interface IIBWithdrawal extends Document {
  ib_user_id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetails: string; // Could be bank info, crypto address, etc.
  processedAt?: Date;
  createdAt: Date;
}

const IBWithdrawalSchema = new Schema<IIBWithdrawal>(
  {
    ib_user_id: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    paymentDetails: { type: String, required: true },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.IBWithdrawal || mongoose.model<IIBWithdrawal>('IBWithdrawal', IBWithdrawalSchema);

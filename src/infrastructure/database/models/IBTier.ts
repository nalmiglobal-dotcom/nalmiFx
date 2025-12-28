import mongoose, { Schema, Document } from 'mongoose';

export interface IIBTier extends Document {
  name: string;
  minReferrals: number;
  maxReferrals: number;
  commissionRate: number; // e.g., 0.1 for 10%
  createdAt: Date;
}

const IBTierSchema = new Schema<IIBTier>(
  {
    name: { type: String, required: true, unique: true },
    minReferrals: { type: Number, required: true },
    maxReferrals: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.IBTier || mongoose.model<IIBTier>('IBTier', IBTierSchema);

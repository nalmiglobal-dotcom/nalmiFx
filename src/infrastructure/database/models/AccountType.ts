import mongoose, { Schema, Document } from 'mongoose';

export interface IAccountType extends Document {
  name: string;
  type: 'wallet' | 'trading' | 'challenge';
  description?: string;
  minDeposit: number;
  maxLeverage: number;
  spread: number;
  commission: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountTypeSchema = new Schema<IAccountType>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['wallet', 'trading', 'challenge'],
      default: 'trading',
    },
    description: {
      type: String,
    },
    minDeposit: {
      type: Number,
      default: 0,
    },
    maxLeverage: {
      type: Number,
      default: 100,
    },
    spread: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
    features: [{
      type: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const AccountType = mongoose.models.AccountType || mongoose.model<IAccountType>('AccountType', AccountTypeSchema);

export default AccountType;

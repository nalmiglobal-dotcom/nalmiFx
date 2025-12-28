import mongoose, { Schema, Document } from 'mongoose';

export interface IIBSettings extends Document {
  singleton: boolean; // Used to enforce a single document
  defaultCommissionRate: number; // e.g., 0.05 for 5%
  minWithdrawalAmount: number;
  kycRequiredForWithdrawal: boolean;
  cookieDurationDays: number; // How long the referral cookie lasts
}

const IBSettingsSchema = new Schema<IIBSettings>(
  {
    singleton: { type: Boolean, default: true, unique: true },
    defaultCommissionRate: { type: Number, default: 0.05 },
    minWithdrawalAmount: { type: Number, default: 50 },
    kycRequiredForWithdrawal: { type: Boolean, default: false },
    cookieDurationDays: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export default mongoose.models.IBSettings || mongoose.model<IIBSettings>('IBSettings', IBSettingsSchema);

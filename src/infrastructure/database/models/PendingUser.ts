import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
  email: string;
  password: string; // hashed
  name: string;
  phone?: string;
  ref?: string; // referral code
  otp: string;
  otpExpiresAt: Date;
  createdAt: Date;
}

const PendingUserSchema = new Schema<IPendingUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    ref: {
      type: String,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete after 15 minutes (OTP expiry + buffer)
PendingUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

const PendingUser = mongoose.models.PendingUser || mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);

export default PendingUser;

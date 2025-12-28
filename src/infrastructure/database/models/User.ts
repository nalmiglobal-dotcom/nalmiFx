import mongoose, { Schema, Document } from 'mongoose';

// User model - for regular trading users only (admins use AdminUser model)
export interface IUser extends Document {
  userId: number;
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  isBanned: boolean;
  isReadOnly: boolean;
  banReason?: string;
  status: 'active' | 'inactive' | 'banned' | 'readonly';
  role: 'user' | 'vip' | 'premium';
  phone?: string;
  address?: string;
  country?: string;
  kycVerified: boolean;
  isEmailVerified: boolean;
  kycDocuments?: {
    idType?: string;
    idNumber?: string;
    idFront?: string;
    idBack?: string;
    selfie?: string;
    proofOfAddress?: string;
    status?: 'pending' | 'approved' | 'rejected';
  };
  ib_code?: string;
  referred_by?: number;
  isIB: boolean;
  ib_commission_rate?: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  createdByAdmin?: number; // Admin who created this user
}

const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: Number,
      required: false,
      unique: true,
      index: true,
    },
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
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isReadOnly: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned', 'readonly'],
      default: 'active',
    },
    role: {
      type: String,
      enum: ['user', 'vip', 'premium'],
      default: 'user',
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    country: {
      type: String,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    kycDocuments: {
      idType: String,
      idNumber: String,
      idFront: String,
      idBack: String,
      selfie: String,
      proofOfAddress: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
    },
    ib_code: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    referred_by: {
      type: Number,
      required: false,
      index: true,
    },
    isIB: {
      type: Boolean,
      default: false,
    },
    ib_commission_rate: {
      type: Number,
      default: 0.1,
    },
    lastLogin: {
      type: Date,
    },
    createdByAdmin: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: userId is generated in API routes before saving (see src/app/api/auth/signup/route.ts)
// No pre-save hook needed as userId is always set before save

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);


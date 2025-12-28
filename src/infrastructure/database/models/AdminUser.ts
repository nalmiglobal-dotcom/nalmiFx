import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  adminId: number;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  phone?: string;
  avatar?: string;
  lastLogin?: Date;
  createdBy?: number; // adminId of creator
  referralCode: string; // Unique referral code for admin business
  referredUsers: number[]; // userIds referred by this admin
  referredAdmins: number[]; // adminIds referred by this admin
  parentAdminId?: number; // Admin who referred this admin
  commissionRate: number; // Commission percentage for this admin
  settlementPending: number; // Amount pending settlement with super admin
  totalEarnings: number; // Total earnings from referrals/business
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    adminId: {
      type: Number,
      required: true,
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
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator'],
      default: 'admin',
    },
    permissions: {
      type: [String],
      default: ['read'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    phone: {
      type: String,
    },
    avatar: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: Number,
      index: true,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredUsers: {
      type: [Number],
      default: [],
    },
    referredAdmins: {
      type: [Number],
      default: [],
    },
    parentAdminId: {
      type: Number,
      index: true,
    },
    commissionRate: {
      type: Number,
      default: 10, // 10% default commission
    },
    settlementPending: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique referral code
function generateAdminReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ADM';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate adminId and referralCode before saving
AdminUserSchema.pre('save', async function () {
  if (this.isNew) {
    if (!this.adminId) {
      try {
        const lastAdmin: any = await mongoose.models.AdminUser?.findOne().sort({ adminId: -1 }).lean();
        this.adminId = lastAdmin && lastAdmin.adminId ? lastAdmin.adminId + 1 : 1;
      } catch (e) {
        this.adminId = 1;
      }
    }
    if (!this.referralCode) {
      let code = generateAdminReferralCode();
      // Ensure uniqueness
      while (await mongoose.models.AdminUser?.findOne({ referralCode: code })) {
        code = generateAdminReferralCode();
      }
      this.referralCode = code;
    }
  }
});

export default mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

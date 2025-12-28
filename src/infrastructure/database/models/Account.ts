import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  userId: number;
  accountNumber: string; // 7-digit numeric ID
  accountName: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingProfit: number;
  status: 'active' | 'inactive' | 'suspended';
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  totalProfit?: number;
  totalLoss?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    equity: {
      type: Number,
      default: 0,
    },
    margin: {
      type: Number,
      default: 0,
    },
    freeMargin: {
      type: Number,
      default: 0,
    },
    marginLevel: {
      type: Number,
      default: 0,
    },
    floatingProfit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    totalTrades: {
      type: Number,
      default: 0,
    },
    winningTrades: {
      type: Number,
      default: 0,
    },
    losingTrades: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    totalLoss: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate 7-digit numeric account number before saving
AccountSchema.pre('save', async function () {
  if (this.isNew && !this.accountNumber) {
    const minAccountNumber = 1000000;
    const maxAccountNumber = 9999999;

    try {
      const lastAccount: any = await mongoose.models.Account?.findOne().sort({ accountNumber: -1 }).lean();
      let nextNumber = minAccountNumber;
      if (lastAccount && lastAccount.accountNumber) {
        const lastNum = parseInt(lastAccount.accountNumber);
        if (!isNaN(lastNum) && lastNum >= minAccountNumber && lastNum < maxAccountNumber) {
          nextNumber = lastNum + 1;
        }
      }
      this.accountNumber = nextNumber.toString().padStart(7, '0');
    } catch (e) {
      const fallbackNumber = parseInt(Date.now().toString().slice(-7));
      this.accountNumber = fallbackNumber.toString().padStart(7, '0');
    }
  }
});

export default mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);


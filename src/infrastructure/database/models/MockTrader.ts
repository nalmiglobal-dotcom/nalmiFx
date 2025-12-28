import mongoose, { Schema, Document } from 'mongoose';

export interface IMockTrader extends Document {
  name: string;
  country: string;
  avatar?: string;
  baseProfit: number;
  baseProfitPercentage: number;
  baseTrades: number;
  baseWinRatio: number;
  volatility: number; // How much their stats fluctuate (0-1)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MockTraderSchema = new Schema<IMockTrader>(
  {
    name: { type: String, required: true },
    country: { type: String, default: '-' },
    avatar: { type: String },
    baseProfit: { type: Number, default: 0 },
    baseProfitPercentage: { type: Number, default: 0 },
    baseTrades: { type: Number, default: 0 },
    baseWinRatio: { type: Number, default: 0 },
    volatility: { type: Number, default: 0.2, min: 0, max: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Generate randomized stats for leaderboard display
MockTraderSchema.methods.getRandomizedStats = function () {
  const fluctuation = () => 1 + (Math.random() - 0.5) * 2 * this.volatility;
  return {
    odType: 'mock' as const,
    odId: this._id,
    odName: this.name,
    odCountry: this.country,
    odAvatar: this.avatar,
    trades: Math.round(this.baseTrades * fluctuation()),
    winRatio: Math.min(100, Math.max(0, Math.round(this.baseWinRatio * fluctuation()))),
    profit: Math.round(this.baseProfit * fluctuation() * 100) / 100,
    profitPercentage: Math.round(this.baseProfitPercentage * fluctuation() * 100) / 100,
  };
};

export default mongoose.models.MockTrader || mongoose.model<IMockTrader>('MockTrader', MockTraderSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetition extends Document {
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  category: 'top_scalping' | 'top_trading' | 'most_profit' | 'trader_of_day' | 'general';
  startDate: Date;
  endDate: Date;
  entryOpenDate: Date;
  entryCloseDate: Date;
  entryFee: number;
  prizePool: {
    total: number;
    breakdown?: Array<{
      position: number;
      prize: number;
      percentage?: number;
    }>;
  };
  winnerPrizes: {
    first: number;
    second: number;
    third: number;
    others?: Array<{ position: number; prize: number }>;
  };
  status: 'upcoming' | 'ongoing' | 'ended';
  participants: mongoose.Types.ObjectId[];
  maxParticipants?: number;
  rules?: {
    minTrades?: number;
    maxTrades?: number;
    minProfitTarget?: number;
    maxDailyLoss?: number;
    maxOverallLoss?: number;
    allowedAccountSizes?: string[];
    allowedChallengeTypes?: mongoose.Types.ObjectId[];
    customRules?: string[];
  };
  leaderboard?: Array<{
    odType: 'user' | 'mock';
    odId: mongoose.Types.ObjectId;
    odName: string;
    odCountry?: string;
    odAvatar?: string;
    trades: number;
    winRatio: number;
    profit: number;
    profitPercentage: number;
    rank: number;
  }>;
  winners?: Array<{
    odType: 'user' | 'mock';
    odId: mongoose.Types.ObjectId;
    odName: string;
    position: number;
    prize: number;
    profit: number;
    profitPercentage: number;
  }>;
  organizer: string;
  tags?: string[];
  featuredImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionSchema = new Schema<ICompetition>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      required: true,
      default: 'monthly',
    },
    category: {
      type: String,
      enum: ['top_scalping', 'top_trading', 'most_profit', 'trader_of_day', 'general'],
      default: 'general',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    entryOpenDate: { type: Date },
    entryCloseDate: { type: Date },
    entryFee: { type: Number, default: 0, min: 0 },
    prizePool: {
      total: { type: Number, default: 0 },
      breakdown: [{ position: Number, prize: Number, percentage: Number }],
    },
    winnerPrizes: {
      first: { type: Number, default: 0 },
      second: { type: Number, default: 0 },
      third: { type: Number, default: 0 },
      others: [{ position: Number, prize: Number }],
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'],
      default: 'upcoming',
      index: true,
    },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    maxParticipants: { type: Number, min: 1 },
    rules: {
      minTrades: { type: Number, min: 0 },
      maxTrades: { type: Number },
      minProfitTarget: { type: Number, min: 0 },
      maxDailyLoss: { type: Number },
      maxOverallLoss: { type: Number },
      allowedAccountSizes: [String],
      allowedChallengeTypes: [{ type: Schema.Types.ObjectId, ref: 'ChallengeType' }],
      customRules: [String],
    },
    leaderboard: [{
      odType: { type: String, enum: ['user', 'mock'], default: 'user' },
      odId: { type: Schema.Types.ObjectId },
      odName: String,
      odCountry: String,
      odAvatar: String,
      trades: { type: Number, default: 0 },
      winRatio: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      profitPercentage: { type: Number, default: 0 },
      rank: { type: Number, default: 0 },
    }],
    winners: [{
      odType: { type: String, enum: ['user', 'mock'], default: 'user' },
      odId: { type: Schema.Types.ObjectId },
      odName: String,
      position: Number,
      prize: Number,
      profit: Number,
      profitPercentage: Number,
    }],
    organizer: { type: String, default: 'NalmiFXs' },
    tags: [String],
    featuredImage: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompetitionSchema.index({ status: 1, startDate: -1 });
CompetitionSchema.index({ type: 1, status: 1 });
CompetitionSchema.index({ category: 1 });

export default mongoose.models.Competition || mongoose.model<ICompetition>('Competition', CompetitionSchema);


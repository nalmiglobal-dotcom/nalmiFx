import mongoose, { Schema, Document } from 'mongoose';

export interface IPhaseProgress {
  phase: number;
  name: string;
  profitTarget: number;
  profitAchieved: number;
  profitPercent: number;
  tradingDays: number;
  minTradingDays: number;
  startDate: Date;
  endDate?: Date;
  status: 'pending' | 'active' | 'passed' | 'failed';
  passedAt?: Date;
}

export interface IPayoutRecord {
  payoutId: string;
  amount: number;
  profitSplit: number;
  payoutOption: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  transactionId?: string;
}

export interface IDailyStats {
  date: Date;
  startingEquity: number;
  endingEquity: number;
  highEquity: number;
  lowEquity: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  tradesCount: number;
  breached: boolean;
}

export interface IChallengeAccount extends Document {
  userId: mongoose.Types.ObjectId;
  challengeType: string; // 'one_step' | 'two_step' | 'instant'
  accountSize: number;
  price: number;
  accountNumber: string;
  platform: string;
  
  // Challenge Status
  status: 'evaluation' | 'funded' | 'breached' | 'expired';
  currentPhase: number;
  totalPhases: number;
  phaseProgress: IPhaseProgress[];
  
  // Balance & Profit Tracking
  initialBalance: number;
  currentBalance: number;
  highWaterMark: number; // highest balance achieved
  currentEquity: number;
  floatingPnL: number;
  realizedPnL: number;
  totalProfitPercent: number;
  
  // Risk Management
  maxDailyLoss: number; // percentage
  maxTotalLoss: number; // percentage
  maxSingleTradeLoss: number; // percentage (funded only)
  dailyLossLimit: number; // absolute value for today
  totalLossLimit: number; // absolute value (breach level)
  currentDailyLoss: number;
  currentDrawdown: number;
  maxDrawdownReached: number;
  
  // Trading Stats
  tradingDaysCount: number;
  tradingDays: Date[];
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  consistencyScore: number;
  
  // Daily Stats History
  dailyStats: IDailyStats[];
  
  // Payout Tracking (for funded accounts)
  payoutOption: string;
  payoutsCount: number;
  totalPayouts: number;
  payoutHistory: IPayoutRecord[];
  nextPayoutDate?: Date;
  
  // Scaling
  scalingLevel: number;
  scaledBalance: number;
  
  // Breach Info
  breachReason?: string;
  breachDate?: Date;
  breachDetails?: string;
  
  // Dates
  startDate: Date;
  lastActivityDate: Date;
  fundedDate?: Date;
  expiryDate?: Date;
  createdAt: Date;
  
  // Trade History
  tradeHistory: {
    tradeId: mongoose.Types.ObjectId;
    symbol: string;
    type: string;
    side: 'buy' | 'sell';
    lots: number;
    openPrice: number;
    closePrice: number;
    profit: number;
    profitPercent: number;
    openedAt: Date;
    closedAt: Date;
  }[];
}

const PhaseProgressSchema = new Schema({
  phase: { type: Number, required: true },
  name: { type: String, required: true },
  profitTarget: { type: Number, required: true },
  profitAchieved: { type: Number, default: 0 },
  profitPercent: { type: Number, default: 0 },
  tradingDays: { type: Number, default: 0 },
  minTradingDays: { type: Number, default: 3 },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['pending', 'active', 'passed', 'failed'], default: 'pending' },
  passedAt: { type: Date },
}, { _id: false });

const PayoutRecordSchema = new Schema({
  payoutId: { type: String, required: true },
  amount: { type: Number, required: true },
  profitSplit: { type: Number, required: true },
  payoutOption: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  transactionId: { type: String },
}, { _id: false });

const DailyStatsSchema = new Schema({
  date: { type: Date, required: true },
  startingEquity: { type: Number, required: true },
  endingEquity: { type: Number, required: true },
  highEquity: { type: Number, required: true },
  lowEquity: { type: Number, required: true },
  dailyPnL: { type: Number, default: 0 },
  dailyPnLPercent: { type: Number, default: 0 },
  tradesCount: { type: Number, default: 0 },
  breached: { type: Boolean, default: false },
}, { _id: false });

const TradeHistorySchema = new Schema({
  tradeId: { type: Schema.Types.ObjectId, ref: 'Trade' },
  symbol: { type: String },
  type: { type: String },
  side: { type: String, enum: ['buy', 'sell'] },
  lots: { type: Number },
  openPrice: { type: Number },
  closePrice: { type: Number },
  profit: { type: Number },
  profitPercent: { type: Number },
  openedAt: { type: Date },
  closedAt: { type: Date },
}, { _id: false });

const ChallengeAccountSchema = new Schema<IChallengeAccount>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  challengeType: { type: String, enum: ['one_step', 'two_step', 'instant'], required: true },
  accountSize: { type: Number, required: true },
  price: { type: Number, required: true },
  accountNumber: { type: String, required: true },
  platform: { type: String, default: 'MetaTrader 5' },
  
  // Challenge Status
  status: { type: String, enum: ['evaluation', 'funded', 'breached', 'expired'], default: 'evaluation' },
  currentPhase: { type: Number, default: 1 },
  totalPhases: { type: Number, default: 2 },
  phaseProgress: [PhaseProgressSchema],
  
  // Balance & Profit Tracking
  initialBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  highWaterMark: { type: Number, default: 0 },
  currentEquity: { type: Number, default: 0 },
  floatingPnL: { type: Number, default: 0 },
  realizedPnL: { type: Number, default: 0 },
  totalProfitPercent: { type: Number, default: 0 },
  
  // Risk Management
  maxDailyLoss: { type: Number, default: 5 },
  maxTotalLoss: { type: Number, default: 10 },
  maxSingleTradeLoss: { type: Number, default: 3 },
  dailyLossLimit: { type: Number, default: 0 },
  totalLossLimit: { type: Number, default: 0 },
  currentDailyLoss: { type: Number, default: 0 },
  currentDrawdown: { type: Number, default: 0 },
  maxDrawdownReached: { type: Number, default: 0 },
  
  // Trading Stats
  tradingDaysCount: { type: Number, default: 0 },
  tradingDays: [{ type: Date }],
  tradesCount: { type: Number, default: 0 },
  winningTrades: { type: Number, default: 0 },
  losingTrades: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  averageWin: { type: Number, default: 0 },
  averageLoss: { type: Number, default: 0 },
  profitFactor: { type: Number, default: 0 },
  largestWin: { type: Number, default: 0 },
  largestLoss: { type: Number, default: 0 },
  consistencyScore: { type: Number, default: 0 },
  
  // Daily Stats History
  dailyStats: [DailyStatsSchema],
  
  // Payout Tracking (for funded accounts)
  payoutOption: { type: String, default: 'bi_weekly' },
  payoutsCount: { type: Number, default: 0 },
  totalPayouts: { type: Number, default: 0 },
  payoutHistory: [PayoutRecordSchema],
  nextPayoutDate: { type: Date },
  
  // Scaling
  scalingLevel: { type: Number, default: 0 },
  scaledBalance: { type: Number, default: 0 },
  
  // Breach Info
  breachReason: { type: String },
  breachDate: { type: Date },
  breachDetails: { type: String },
  
  // Dates
  startDate: { type: Date, default: Date.now },
  lastActivityDate: { type: Date, default: Date.now },
  fundedDate: { type: Date },
  expiryDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  
  // Trade History
  tradeHistory: [TradeHistorySchema],
});

// Indexes for faster queries
ChallengeAccountSchema.index({ userId: 1, status: 1 });
ChallengeAccountSchema.index({ accountNumber: 1 }, { unique: true });
ChallengeAccountSchema.index({ status: 1, lastActivityDate: 1 });

export default mongoose.models.ChallengeAccount || mongoose.model<IChallengeAccount>('ChallengeAccount', ChallengeAccountSchema);

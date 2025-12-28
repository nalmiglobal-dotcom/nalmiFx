import mongoose, { Schema, Document } from 'mongoose';

export interface IPhaseConfig {
  phase: number;
  name: string;
  profitTarget: number; // percentage
  minTradingDays: number;
  tradingPeriodDays: number; // 0 = unlimited
}

export interface IPayoutOption {
  id: string;
  name: string;
  profitSplit: number; // percentage (e.g., 80 = 80%)
  frequency: 'on_demand' | 'weekly' | 'bi_weekly' | 'monthly';
  minPayout: number; // percentage of initial balance
  consistencyRequired: boolean;
  consistencyScore: number; // percentage required if consistencyRequired is true
}

export interface IScalingPlan {
  payoutsRequired: number;
  profitRequired: number; // percentage
  scalePercentage: number; // percentage increase (e.g., 25 = 25% increase)
  maxScale: number; // maximum account size after scaling
}

export interface IChallengeSettings extends Document {
  // Challenge Type Configuration
  challengeTypes: {
    id: string;
    name: string;
    description: string;
    phases: IPhaseConfig[];
    price: number; // base price modifier
    enabled: boolean;
  }[];
  // Account Size Base Prices
  accountSizePrices: {
    size: number;
    price: number;
  }[];
  // Risk Management Rules
  maxDailyLoss: number; // percentage (e.g., 5 = 5%)
  maxTotalLoss: number; // percentage (e.g., 10 = 10%)
  maxSingleTradeLoss: number; // percentage for funded accounts (e.g., 3 = 3%)
  // Payout Configuration
  payoutOptions: IPayoutOption[];
  defaultPayoutOption: string; // id of default payout option
  // Scaling Plan
  scalingEnabled: boolean;
  scalingPlan: IScalingPlan[];
  // General Rules
  inactivityDays: number; // days before account breach due to inactivity
  newsTrading: boolean; // allow trading during news
  weekendHolding: boolean; // allow holding positions over weekend
  // Refund Policy
  refundOnPass: boolean; // refund challenge fee on passing
  refundPercentage: number; // percentage of fee to refund
  // Timestamps
  updatedAt: Date;
  updatedBy: number;
}

const PhaseConfigSchema = new Schema({
  phase: { type: Number, required: true },
  name: { type: String, required: true },
  profitTarget: { type: Number, required: true },
  minTradingDays: { type: Number, default: 3 },
  tradingPeriodDays: { type: Number, default: 0 }, // 0 = unlimited
}, { _id: false });

const PayoutOptionSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  profitSplit: { type: Number, required: true },
  frequency: { type: String, enum: ['on_demand', 'weekly', 'bi_weekly', 'monthly'], required: true },
  minPayout: { type: Number, default: 1 },
  consistencyRequired: { type: Boolean, default: false },
  consistencyScore: { type: Number, default: 0 },
}, { _id: false });

const ScalingPlanSchema = new Schema({
  payoutsRequired: { type: Number, required: true },
  profitRequired: { type: Number, required: true },
  scalePercentage: { type: Number, required: true },
  maxScale: { type: Number, required: true },
}, { _id: false });

const ChallengeTypeSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  phases: [PhaseConfigSchema],
  price: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const ChallengeSettingsSchema = new Schema<IChallengeSettings>({
  // Challenge Types with Phase Configuration
  challengeTypes: [ChallengeTypeSchema],
  // Account Size Base Prices
  accountSizePrices: [{
    size: { type: Number, required: true },
    price: { type: Number, required: true },
  }],
  // Risk Management Rules
  maxDailyLoss: { type: Number, default: 5 },
  maxTotalLoss: { type: Number, default: 10 },
  maxSingleTradeLoss: { type: Number, default: 3 },
  // Payout Configuration
  payoutOptions: [PayoutOptionSchema],
  defaultPayoutOption: { type: String, default: 'bi_weekly' },
  // Scaling Plan
  scalingEnabled: { type: Boolean, default: true },
  scalingPlan: [ScalingPlanSchema],
  // General Rules
  inactivityDays: { type: Number, default: 30 },
  newsTrading: { type: Boolean, default: true },
  weekendHolding: { type: Boolean, default: true },
  // Refund Policy
  refundOnPass: { type: Boolean, default: true },
  refundPercentage: { type: Number, default: 100 },
  // Timestamps
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Number },
});

// Default prop firm configuration
const DEFAULT_CHALLENGE_TYPES = [
  {
    id: 'two_step',
    name: 'Two Step Challenge',
    description: 'Classic evaluation: Phase 1 (8% target) → Phase 2 (5% target) → Funded',
    phases: [
      { phase: 1, name: 'Student Phase', profitTarget: 8, minTradingDays: 3, tradingPeriodDays: 0 },
      { phase: 2, name: 'Practitioner Phase', profitTarget: 5, minTradingDays: 3, tradingPeriodDays: 0 },
    ],
    price: 0,
    enabled: true,
  },
  {
    id: 'one_step',
    name: 'One Step Challenge',
    description: 'Fast track: Single phase (10% target) → Funded',
    phases: [
      { phase: 1, name: 'Evaluation Phase', profitTarget: 10, minTradingDays: 3, tradingPeriodDays: 0 },
    ],
    price: 50,
    enabled: true,
  },
  {
    id: 'instant',
    name: 'Instant Funding',
    description: 'Skip evaluation and get funded immediately with stricter rules',
    phases: [],
    price: 200,
    enabled: true,
  },
];

const DEFAULT_PAYOUT_OPTIONS = [
  { id: 'on_demand', name: 'On-Demand', profitSplit: 90, frequency: 'on_demand', minPayout: 2, consistencyRequired: true, consistencyScore: 35 },
  { id: 'weekly', name: 'Weekly Payday', profitSplit: 60, frequency: 'weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
  { id: 'bi_weekly', name: 'Bi-Weekly', profitSplit: 80, frequency: 'bi_weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
  { id: 'monthly', name: 'Monthly', profitSplit: 100, frequency: 'monthly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
];

const DEFAULT_SCALING_PLAN = [
  { payoutsRequired: 4, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
  { payoutsRequired: 8, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
  { payoutsRequired: 12, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
];

const DEFAULT_ACCOUNT_SIZES = [
  { size: 5000, price: 49 },
  { size: 10000, price: 99 },
  { size: 25000, price: 199 },
  { size: 50000, price: 299 },
  { size: 100000, price: 529 },
  { size: 200000, price: 999 },
];

// Ensure only one settings document exists and auto-populate missing fields
ChallengeSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (settings) {
    // Auto-populate missing fields for existing settings
    let needsSave = false;
    
    if (!settings.challengeTypes || settings.challengeTypes.length === 0) {
      settings.challengeTypes = DEFAULT_CHALLENGE_TYPES;
      needsSave = true;
    }
    if (!settings.payoutOptions || settings.payoutOptions.length === 0) {
      settings.payoutOptions = DEFAULT_PAYOUT_OPTIONS;
      needsSave = true;
    }
    if (!settings.scalingPlan || settings.scalingPlan.length === 0) {
      settings.scalingPlan = DEFAULT_SCALING_PLAN;
      needsSave = true;
    }
    if (!settings.accountSizePrices || settings.accountSizePrices.length === 0) {
      settings.accountSizePrices = DEFAULT_ACCOUNT_SIZES;
      needsSave = true;
    }
    if (settings.defaultPayoutOption === undefined) {
      settings.defaultPayoutOption = 'bi_weekly';
      needsSave = true;
    }
    if (settings.scalingEnabled === undefined) {
      settings.scalingEnabled = true;
      needsSave = true;
    }
    
    if (needsSave) {
      settings.updatedAt = new Date();
      await settings.save();
    }
    
    return settings;
  }
  
  // Create new settings with defaults
  settings = await this.create({
    challengeTypes: DEFAULT_CHALLENGE_TYPES,
    accountSizePrices: DEFAULT_ACCOUNT_SIZES,
    maxDailyLoss: 5,
    maxTotalLoss: 10,
    maxSingleTradeLoss: 3,
    payoutOptions: DEFAULT_PAYOUT_OPTIONS,
    defaultPayoutOption: 'bi_weekly',
    scalingEnabled: true,
    scalingPlan: DEFAULT_SCALING_PLAN,
    inactivityDays: 30,
    newsTrading: true,
    weekendHolding: true,
    refundOnPass: true,
    refundPercentage: 100,
  });
  
  return settings;
};

export default mongoose.models.ChallengeSettings || mongoose.model<IChallengeSettings>('ChallengeSettings', ChallengeSettingsSchema);

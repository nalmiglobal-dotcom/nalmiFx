import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISpreadConfig {
  symbol: string;
  spreadPips: number; // Spread in pips to add to market price
  enabled: boolean;
}

export interface IChargeConfig {
  chargeType: 'per_lot' | 'per_execution' | 'percentage'; // How to calculate charge
  chargeAmount: number; // Amount or percentage
  minCharge: number; // Minimum charge
  maxCharge: number; // Maximum charge (0 = no max)
}

export interface ISegmentCharge {
  segment: string; // forex, crypto, commodities, indices, stocks
  chargeType: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount: number;
  minCharge: number;
  maxCharge: number;
  enabled: boolean;
}

export interface ITradingSettings extends Document {
  // Account settings
  minDeposit: number;
  leverage: number;
  tradeCharges: number; // Flat charge per trade
  
  // Global settings
  globalSpreadPips: number; // Default spread for all instruments
  globalChargeType: 'per_lot' | 'per_execution' | 'percentage';
  globalChargeAmount: number;
  globalMinCharge: number;
  globalMaxCharge: number;
  
  // Per-instrument spread overrides
  instrumentSpreads: ISpreadConfig[];
  
  // Segment-wise charges
  segmentCharges: ISegmentCharge[];
  
  // Per-instrument charge overrides
  instrumentCharges: Map<string, IChargeConfig>;
  
  // Broker income tracking
  totalSpreadIncome: number;
  totalChargeIncome: number;
  
  // Settings
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const SpreadConfigSchema = new Schema({
  symbol: { type: String, required: true },
  spreadPips: { type: Number, required: true, default: 0 },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const ChargeConfigSchema = new Schema({
  chargeType: { 
    type: String, 
    enum: ['per_lot', 'per_execution', 'percentage'],
    default: 'per_lot'
  },
  chargeAmount: { type: Number, default: 0 },
  minCharge: { type: Number, default: 0 },
  maxCharge: { type: Number, default: 0 },
}, { _id: false });

const TradingSettingsSchema = new Schema<ITradingSettings>({
  // Account settings
  minDeposit: { type: Number, default: 100 },
  leverage: { type: Number, default: 100 },
  tradeCharges: { type: Number, default: 0 }, // Flat charge per trade
  
  // Global defaults
  globalSpreadPips: { type: Number, default: 2 }, // 2 pips default
  globalChargeType: { 
    type: String, 
    enum: ['per_lot', 'per_execution', 'percentage'],
    default: 'per_lot'
  },
  globalChargeAmount: { type: Number, default: 5 }, // $5 per lot default
  globalMinCharge: { type: Number, default: 0.5 },
  globalMaxCharge: { type: Number, default: 0 }, // 0 = no max
  
  // Per-instrument overrides
  instrumentSpreads: [SpreadConfigSchema],
  
  // Segment-wise charges
  segmentCharges: [{
    segment: { type: String, required: true },
    chargeType: { 
      type: String, 
      enum: ['per_lot', 'per_execution', 'percentage'],
      default: 'per_lot'
    },
    chargeAmount: { type: Number, default: 0 },
    minCharge: { type: Number, default: 0 },
    maxCharge: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  }],
  
  instrumentCharges: {
    type: Map,
    of: ChargeConfigSchema,
    default: new Map(),
  },
  
  // Income tracking
  totalSpreadIncome: { type: Number, default: 0 },
  totalChargeIncome: { type: Number, default: 0 },
  
  // Meta
  isActive: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
}, {
  timestamps: true,
});

// Ensure only one active settings document
TradingSettingsSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

const TradingSettings: Model<ITradingSettings> = mongoose.models.TradingSettings || mongoose.model<ITradingSettings>('TradingSettings', TradingSettingsSchema);

export default TradingSettings;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrokerIncome extends Document {
  tradeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  symbol: string;
  tradeType: 'buy' | 'sell';
  lotSize: number;
  
  // Spread income
  spreadPips: number;
  spreadAmount: number; // USD value of spread
  
  // Commission/Charge income
  chargeType: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount: number; // USD charged
  
  // Totals
  totalIncome: number; // spreadAmount + chargeAmount
  
  // Meta
  createdAt: Date;
}

const BrokerIncomeSchema = new Schema<IBrokerIncome>({
  tradeId: { type: Schema.Types.ObjectId, ref: 'Trade', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  tradeType: { type: String, enum: ['buy', 'sell'], required: true },
  lotSize: { type: Number, required: true },
  
  spreadPips: { type: Number, default: 0 },
  spreadAmount: { type: Number, default: 0 },
  
  chargeType: { 
    type: String, 
    enum: ['per_lot', 'per_execution', 'percentage'],
    default: 'per_lot'
  },
  chargeAmount: { type: Number, default: 0 },
  
  totalIncome: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Indexes for reporting
BrokerIncomeSchema.index({ createdAt: -1 });
BrokerIncomeSchema.index({ userId: 1, createdAt: -1 });
BrokerIncomeSchema.index({ symbol: 1, createdAt: -1 });

const BrokerIncome: Model<IBrokerIncome> = mongoose.models.BrokerIncome || mongoose.model<IBrokerIncome>('BrokerIncome', BrokerIncomeSchema);

export default BrokerIncome;

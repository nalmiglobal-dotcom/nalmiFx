import mongoose, { Schema, Document } from 'mongoose';

export interface IIBCommission extends Document {
  ib_user_id: number;
  referred_user_id: number;
  trade_id?: mongoose.Types.ObjectId;
  brokerage: number;
  commission_amount: number;
  createdAt: Date;
}

const IBCommissionSchema = new Schema<IIBCommission>(
  {
    ib_user_id: { type: Number, required: true, index: true },
    referred_user_id: { type: Number, required: true, index: true },
    trade_id: { type: Schema.Types.ObjectId, ref: 'Trade' },
    brokerage: { type: Number, required: true },
    commission_amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.IBCommission || mongoose.model<IIBCommission>('IBCommission', IBCommissionSchema);

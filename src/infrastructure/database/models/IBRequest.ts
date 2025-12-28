import mongoose, { Schema, Document } from 'mongoose';

export interface IIBRequest extends Document {
  userId: number;
  user?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  commission_percentage?: number;
  commission_structure_id?: string;
  agreed_terms_version?: string;
  requested_at: Date;
  reviewed_at?: Date;
  admin_reason?: string;
}

const IBRequestSchema = new Schema<IIBRequest>(
  {
    userId: { type: Number, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    commission_percentage: { type: Number },
    commission_structure_id: { type: String },
    agreed_terms_version: { type: String },
    requested_at: { type: Date, default: () => new Date() },
    reviewed_at: { type: Date },
    admin_reason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.IBRequest || mongoose.model<IIBRequest>('IBRequest', IBRequestSchema);

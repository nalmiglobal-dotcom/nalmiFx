import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentMethod extends Document {
  type: 'bank' | 'upi' | 'qr';
  name: string;
  isActive: boolean;
  // Bank account details
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifscCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  // UPI details
  upiId?: string;
  // QR Code (stored as base64 or URL)
  qrCode?: string;
  qrCodeUrl?: string;
  // Additional notes
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: {
      type: String,
      enum: ['bank', 'upi', 'qr'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bankName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    accountName: {
      type: String,
    },
    ifscCode: {
      type: String,
    },
    swiftCode: {
      type: String,
    },
    routingNumber: {
      type: String,
    },
    upiId: {
      type: String,
    },
    qrCode: {
      type: String, // Base64 encoded QR code image
    },
    qrCodeUrl: {
      type: String, // URL to QR code image
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);


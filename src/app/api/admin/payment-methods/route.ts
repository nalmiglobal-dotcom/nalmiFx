import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import PaymentMethod from '@/infrastructure/database/models/PaymentMethod';

// GET - Fetch all payment methods
export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const paymentMethods = await PaymentMethod.find().sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      paymentMethods,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST - Create new payment method
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const body = await request.json();
    const {
      type,
      name,
      isActive,
      bankName,
      accountNumber,
      accountName,
      ifscCode,
      swiftCode,
      routingNumber,
      upiId,
      qrCode,
      qrCodeUrl,
      notes,
    } = body;

    if (!type || !name) {
      return NextResponse.json(
        { success: false, message: 'Type and name are required' },
        { status: 400 }
      );
    }

    if (!['bank', 'upi', 'qr'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    // Validate based on type
    if (type === 'bank' && (!accountNumber || !accountName)) {
      return NextResponse.json(
        { success: false, message: 'Account number and account name are required for bank accounts' },
        { status: 400 }
      );
    }

    if (type === 'upi' && !upiId) {
      return NextResponse.json(
        { success: false, message: 'UPI ID is required' },
        { status: 400 }
      );
    }

    if (type === 'qr' && !qrCode && !qrCodeUrl) {
      return NextResponse.json(
        { success: false, message: 'QR code or QR code URL is required' },
        { status: 400 }
      );
    }

    const paymentMethod = new PaymentMethod({
      type,
      name,
      isActive: isActive !== undefined ? isActive : true,
      bankName,
      accountNumber,
      accountName,
      ifscCode,
      swiftCode,
      routingNumber,
      upiId,
      qrCode,
      qrCodeUrl,
      notes,
    });

    await paymentMethod.save();

    return NextResponse.json({
      success: true,
      message: 'Payment method created successfully',
      paymentMethod,
    });
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create payment method' },
      { status: 500 }
    );
  }
}


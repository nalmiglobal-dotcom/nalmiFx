import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import PaymentMethod from '@/infrastructure/database/models/PaymentMethod';
import mongoose from 'mongoose';

// PUT - Update payment method
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method ID' },
        { status: 400 }
      );
    }

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

    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (type) paymentMethod.type = type;
    if (name) paymentMethod.name = name;
    if (isActive !== undefined) paymentMethod.isActive = isActive;
    if (bankName !== undefined) paymentMethod.bankName = bankName;
    if (accountNumber !== undefined) paymentMethod.accountNumber = accountNumber;
    if (accountName !== undefined) paymentMethod.accountName = accountName;
    if (ifscCode !== undefined) paymentMethod.ifscCode = ifscCode;
    if (swiftCode !== undefined) paymentMethod.swiftCode = swiftCode;
    if (routingNumber !== undefined) paymentMethod.routingNumber = routingNumber;
    if (upiId !== undefined) paymentMethod.upiId = upiId;
    if (qrCode !== undefined) paymentMethod.qrCode = qrCode;
    if (qrCodeUrl !== undefined) paymentMethod.qrCodeUrl = qrCodeUrl;
    if (notes !== undefined) paymentMethod.notes = notes;

    await paymentMethod.save();

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      paymentMethod,
    });
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// DELETE - Delete payment method
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method ID' },
        { status: 400 }
      );
    }

    const paymentMethod = await PaymentMethod.findByIdAndDelete(id);

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}


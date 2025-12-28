import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import PendingOrder from '@/infrastructure/database/models/PendingOrder';
import mongoose from 'mongoose';

// PUT - Modify pending order
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    await connect();
    const { id } = await params;
    const body = await request.json();
    const { triggerPrice, stopLoss, takeProfit, lot } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
    }

    const order = await PendingOrder.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Can only modify pending orders' }, { status: 400 });
    }

    // Update fields
    if (triggerPrice !== undefined) order.triggerPrice = triggerPrice;
    if (stopLoss !== undefined) order.stopLoss = stopLoss || undefined;
    if (takeProfit !== undefined) order.takeProfit = takeProfit || undefined;
    if (lot !== undefined && lot >= 0.01) order.lot = lot;

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Pending order modified',
      order,
    });
  } catch (error: any) {
    console.error('Error modifying pending order:', error);
    return NextResponse.json({ success: false, message: 'Failed to modify pending order' }, { status: 500 });
  }
}

// DELETE - Cancel pending order
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    await connect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
    }

    const order = await PendingOrder.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== session.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Can only cancel pending orders' }, { status: 400 });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = 'User cancelled';
    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Pending order cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling pending order:', error);
    return NextResponse.json({ success: false, message: 'Failed to cancel pending order' }, { status: 500 });
  }
}

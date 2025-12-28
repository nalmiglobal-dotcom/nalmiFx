import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import Wallet from '@/infrastructure/database/models/Wallet';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const body = await request.json();
    const { amount, method, accountDetails } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!['bank', 'upi', 'crypto'].includes(method)) {
      return NextResponse.json(
        { success: false, message: 'Invalid withdrawal method' },
        { status: 400 }
      );
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId: session.userId });
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json(
        { success: false, message: 'Insufficient balance' },
        { status: 400 }
      );
    }

    const transaction = new Transaction({
      userId: session.userId,
      type: 'withdrawal',
      amount,
      method,
      accountDetails,
      status: 'pending',
    });

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Waiting for admin approval.',
      transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to submit withdrawal request' },
      { status: 500 }
    );
  }
}


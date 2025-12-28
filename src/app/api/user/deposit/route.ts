import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import AccountType from '@/infrastructure/database/models/AccountType';

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
    const { amount, method, paymentMethodId, transactionId, accountDetails, accountTypeId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!['bank', 'upi', 'crypto', 'paypal'].includes(method)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment method' },
        { status: 400 }
      );
    }

    if (!transactionId || transactionId.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Transaction ID/UTR number is required' },
        { status: 400 }
      );
    }

    // Validate minimum deposit if account type is specified
    if (accountTypeId) {
      const accountType = await AccountType.findById(accountTypeId);
      if (accountType && accountType.isActive) {
        if (accountType.type === 'trading' && amount < accountType.minDeposit) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Minimum deposit for ${accountType.name} account is $${accountType.minDeposit}. You are depositing $${amount}. Please deposit at least $${accountType.minDeposit}.` 
            },
            { status: 400 }
          );
        }
      }
    }

    const transaction = new Transaction({
      userId: session.userId,
      type: 'deposit',
      amount,
      method,
      paymentMethodId: paymentMethodId || undefined,
      transactionId: transactionId.trim(),
      accountDetails,
      accountTypeId: accountTypeId || undefined,
      status: 'pending',
    });

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: 'Deposit request submitted successfully. Waiting for admin approval.',
      transaction,
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit deposit request' },
      { status: 500 }
    );
  }
}


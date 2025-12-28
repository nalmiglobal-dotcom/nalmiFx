import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import Wallet from '@/infrastructure/database/models/Wallet';
import User from '@/infrastructure/database/models/User';
import AccountType from '@/infrastructure/database/models/AccountType';
import mongoose from 'mongoose';

// PUT - Approve or reject deposit
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
    const body = await request.json();
    const { action, adminNotes } = body; // action: 'approve' | 'reject'

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.type !== 'deposit') {
      return NextResponse.json(
        { success: false, message: 'This is not a deposit transaction' },
        { status: 400 }
      );
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: `Transaction is already ${transaction.status}` },
        { status: 400 }
      );
    }

    // Update transaction status
    transaction.status = action === 'approve' ? 'approved' : 'rejected';
    transaction.processedBy = session.userId;
    transaction.processedAt = new Date();
    if (adminNotes) {
      transaction.adminNotes = adminNotes;
    }

    // If approved, validate minimum deposit and add funds to user's wallet
    if (action === 'approve') {
      // Validate minimum deposit if account type is specified
      if (transaction.accountTypeId) {
        const accountType = await AccountType.findById(transaction.accountTypeId);
        if (accountType && accountType.isActive && accountType.type === 'trading') {
          if (transaction.amount < accountType.minDeposit) {
            return NextResponse.json(
              { 
                success: false, 
                message: `Cannot approve deposit. Minimum deposit for ${accountType.name} account is $${accountType.minDeposit}. Deposit amount is $${transaction.amount}. Please reject this deposit and notify the user about the minimum deposit requirement.` 
              },
              { status: 400 }
            );
          }
        }
      }

      let wallet = await Wallet.findOne({ userId: transaction.userId });

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = new Wallet({
          userId: transaction.userId,
          balance: 0,
          equity: 0,
          margin: 0,
          freeMargin: 0,
          marginLevel: 0,
          floatingProfit: 0,
        });
      }

      // Add deposit amount to wallet
      wallet.balance += transaction.amount;
      wallet.equity += transaction.amount;
      wallet.freeMargin += transaction.amount;

      await wallet.save();

      // Update user balance
      await User.findOneAndUpdate(
        { userId: transaction.userId },
        { $inc: { balance: transaction.amount } }
      );
    }

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: `Deposit ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      transaction,
    });
  } catch (error: any) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process deposit' },
      { status: 500 }
    );
  }
}


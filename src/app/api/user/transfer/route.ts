import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Wallet from '@/infrastructure/database/models/Wallet';
import Account from '@/infrastructure/database/models/Account';
import Transfer from '@/infrastructure/database/models/Transfer';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const body = await request.json();
    const { fromType, fromAccountId, toType, toAccountId, amount } = body;

    if (!fromType || !toType || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get source balance
    let sourceBalance = 0;
    if (fromType === 'wallet') {
      const wallet = await Wallet.findOne({ userId: session.userId });
      if (!wallet) {
        return NextResponse.json(
          { success: false, message: 'Wallet not found' },
          { status: 404 }
        );
      }
      sourceBalance = wallet.balance;
    } else if (fromType === 'trading') {
      if (!fromAccountId) {
        return NextResponse.json(
          { success: false, message: 'Source account ID required' },
          { status: 400 }
        );
      }
      const account = await Account.findOne({ 
        _id: fromAccountId, 
        userId: session.userId 
      });
      if (!account) {
        return NextResponse.json(
          { success: false, message: 'Source account not found' },
          { status: 404 }
        );
      }
      sourceBalance = account.balance;
    }

    // Check balance
    if (transferAmount > sourceBalance) {
      return NextResponse.json(
        { success: false, message: `Insufficient balance. Available: $${sourceBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Deduct from source
    if (fromType === 'wallet') {
      const wallet = await Wallet.findOne({ userId: session.userId });
      if (wallet) {
        wallet.balance -= transferAmount;
        wallet.equity -= transferAmount;
        await wallet.save();
      }
    } else if (fromType === 'trading') {
      const fromAccount = await Account.findById(fromAccountId);
      if (fromAccount) {
        fromAccount.balance -= transferAmount;
        fromAccount.equity -= transferAmount;
        fromAccount.freeMargin = fromAccount.equity - fromAccount.margin;
        await fromAccount.save();
      }
    }

    // Add to destination
    if (toType === 'wallet') {
      const wallet = await Wallet.findOne({ userId: session.userId });
      if (wallet) {
        wallet.balance += transferAmount;
        wallet.equity += transferAmount;
        await wallet.save();
      }
    } else if (toType === 'trading') {
      if (!toAccountId) {
        return NextResponse.json(
          { success: false, message: 'Destination account ID required' },
          { status: 400 }
        );
      }
      const toAccount = await Account.findById(toAccountId);
      if (toAccount) {
        toAccount.balance += transferAmount;
        toAccount.equity += transferAmount;
        toAccount.freeMargin = toAccount.equity - toAccount.margin;
        await toAccount.save();
      }
    }

    // Create transfer record
    const transfer = new Transfer({
      userId: session.userId,
      fromType,
      fromAccountId: fromType === 'trading' ? new mongoose.Types.ObjectId(fromAccountId) : undefined,
      toType,
      toAccountId: toType === 'trading' ? new mongoose.Types.ObjectId(toAccountId) : undefined,
      amount: transferAmount,
      status: 'completed',
    });

    await transfer.save();

    return NextResponse.json({
      success: true,
      message: 'Transfer completed successfully',
      transfer,
    });
  } catch (error: any) {
    console.error('Error processing transfer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process transfer' },
      { status: 500 }
    );
  }
}

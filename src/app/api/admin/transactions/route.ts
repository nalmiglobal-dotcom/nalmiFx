import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import Wallet from '@/infrastructure/database/models/Wallet';
import User from '@/infrastructure/database/models/User';
import Account from '@/infrastructure/database/models/Account';
import AccountType from '@/infrastructure/database/models/AccountType';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'deposit' | 'withdrawal' | null (all)
    const status = searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | null (all)

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get user names
    const userIds = [...new Set(transactions.map((t: any) => t.userId))];
    const users = await User.find({ userId: { $in: userIds } })
      .select('userId name email')
      .lean();

    const userMap = new Map(users.map((u: any) => [u.userId, u]));

    const transactionsWithUsers = transactions.map((t: any) => ({
      ...t,
      userName: userMap.get(t.userId)?.name || 'Unknown',
      userEmail: userMap.get(t.userId)?.email || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      transactions: transactionsWithUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connect();
    const body = await request.json();
    const { transactionId, status, adminNotes } = body;

    if (!transactionId || !status) {
      return NextResponse.json(
        { success: false, message: 'Transaction ID and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Transaction already processed' },
        { status: 400 }
      );
    }

    transaction.status = status;
    transaction.processedBy = session.userId;
    transaction.processedAt = new Date();
    if (adminNotes) transaction.adminNotes = adminNotes;

    // If approved, update wallet balance
    if (status === 'approved') {
      const wallet = await Wallet.findOne({ userId: transaction.userId });
      if (!wallet) {
        return NextResponse.json(
          { success: false, message: 'Wallet not found' },
          { status: 404 }
        );
      }

      if (transaction.type === 'deposit') {
        // Check if user has any trading accounts and validate minimum deposit
        const tradingAccounts = await Account.find({ 
          userId: transaction.userId, 
          accountType: 'trading',
          status: 'active'
        }).populate('accountTypeId');
        
        if (tradingAccounts.length > 0) {
          // Get the account type with the lowest minimum deposit requirement
          const accountTypes = tradingAccounts
            .map((acc: any) => acc.accountTypeId)
            .filter((at: any) => at && at.isActive);
          
          if (accountTypes.length > 0) {
            const minRequiredDeposit = Math.min(...accountTypes.map((at: any) => at.minDeposit || 0));
            
            if (transaction.amount < minRequiredDeposit) {
              return NextResponse.json(
                { 
                  success: false, 
                  message: `Deposit amount $${transaction.amount} is less than the minimum required deposit of $${minRequiredDeposit} for your account type. Please deposit at least $${minRequiredDeposit}.` 
                },
                { status: 400 }
              );
            }
          }
        } else {
          // If user doesn't have a trading account yet, check against all active trading account types
          // to ensure they can create at least one account type with this deposit
          const allTradingTypes = await AccountType.find({ 
            type: 'trading', 
            isActive: true 
          }).lean();
          
          if (allTradingTypes.length > 0) {
            const minRequiredDeposit = Math.min(...allTradingTypes.map((at: any) => at.minDeposit || 0));
            
            if (transaction.amount < minRequiredDeposit) {
              return NextResponse.json(
                { 
                  success: false, 
                  message: `Deposit amount $${transaction.amount} is less than the minimum required deposit of $${minRequiredDeposit} for any trading account type. Please deposit at least $${minRequiredDeposit}.` 
                },
                { status: 400 }
              );
            }
          }
        }
        
        wallet.balance += transaction.amount;
        wallet.equity = wallet.balance;
        wallet.freeMargin = wallet.balance;
      } else if (transaction.type === 'withdrawal') {
        if (wallet.balance < transaction.amount) {
          return NextResponse.json(
            { success: false, message: 'Insufficient wallet balance' },
            { status: 400 }
          );
        }
        wallet.balance -= transaction.amount;
        wallet.equity = wallet.balance;
        wallet.freeMargin = wallet.balance;
      }

      await wallet.save();

      // Update user balance
      await User.findOneAndUpdate(
        { userId: transaction.userId },
        { balance: wallet.balance }
      );
    }

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: `Transaction ${status} successfully`,
      transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}


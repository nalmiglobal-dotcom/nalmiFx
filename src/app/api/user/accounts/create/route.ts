import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Account from '@/infrastructure/database/models/Account';
import Wallet from '@/infrastructure/database/models/Wallet';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';

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
    const { initialDeposit } = body;

    // Get trading settings (set by admin)
    const settingsDoc = await TradingSettings.findOne();
    const minDeposit = settingsDoc?.minDeposit || 100;

    const deposit = parseFloat(initialDeposit);
    if (isNaN(deposit) || deposit <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid initial deposit is required' },
        { status: 400 }
      );
    }

    if (deposit < minDeposit) {
      return NextResponse.json(
        { success: false, message: `Minimum deposit is $${minDeposit}` },
        { status: 400 }
      );
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId: session.userId });
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (wallet.balance < deposit) {
      return NextResponse.json(
        { success: false, message: `Insufficient wallet balance. Available: $${wallet.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Deduct from wallet
    wallet.balance -= deposit;
    wallet.equity -= deposit;
    await wallet.save();

    // Create trading account
    const account = new Account({
      userId: session.userId,
      accountName: 'Trading Account',
      balance: deposit,
      equity: deposit,
      margin: 0,
      freeMargin: deposit,
      marginLevel: 0,
      floatingProfit: 0,
      status: 'active',
    });

    await account.save();

    return NextResponse.json({
      success: true,
      message: 'Trading account created successfully',
      account: {
        _id: account._id,
        accountNumber: account.accountNumber,
        balance: account.balance,
        status: account.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

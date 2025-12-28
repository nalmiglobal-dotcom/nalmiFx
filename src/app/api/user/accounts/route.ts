import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Account from '@/infrastructure/database/models/Account';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const accounts = await Account.find({ userId: session.userId }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

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
    const { accountType, accountName } = body;

    if (!accountType || !accountName) {
      return NextResponse.json(
        { success: false, message: 'Account type and name are required' },
        { status: 400 }
      );
    }

    if (!['trading', 'challenge'].includes(accountType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid account type' },
        { status: 400 }
      );
    }

    const accountData: any = {
      userId: session.userId,
      accountType,
      accountName,
      balance: 0,
      equity: 0,
      freeMargin: 0,
      margin: 0,
      marginLevel: 0,
      floatingProfit: 0,
      status: 'active',
    };

    const account = new Account(accountData);
    await account.save();

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      account,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to create account' },
      { status: 500 }
    );
  }
}


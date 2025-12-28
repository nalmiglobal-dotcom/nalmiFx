import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Account from '@/infrastructure/database/models/Account';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('type') || 'trading';
    
    const account = await Account.findOne({ 
      userId: session.userId, 
      accountType,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'No active account found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}


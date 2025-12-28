import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import User from '@/infrastructure/database/models/User';
import PaymentMethod from '@/infrastructure/database/models/PaymentMethod';

// GET - Fetch all deposit requests
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const query: any = { type: 'deposit' };
    if (status !== 'all') {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('paymentMethodId', 'name type')
      .sort({ createdAt: -1 })
      .lean();

    // Get user details for each transaction
    const userIds = [...new Set(transactions.map((t: any) => t.userId))];
    const users = await User.find({ userId: { $in: userIds } })
      .select('userId name email')
      .lean();

    const userMap = new Map(users.map((u: any) => [u.userId, u]));

    const deposits = transactions.map((t: any) => ({
      ...t,
      user: userMap.get(t.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      deposits,
    });
  } catch (error: any) {
    console.error('Error fetching deposits:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch deposits' },
      { status: 500 }
    );
  }
}


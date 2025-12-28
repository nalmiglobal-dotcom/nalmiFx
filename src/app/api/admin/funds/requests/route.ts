import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Transaction from '@/infrastructure/database/models/Transaction';
import User from '@/infrastructure/database/models/User';

export async function GET(req: Request) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();

    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (!transactions.length) {
        return NextResponse.json({
            success: true,
            transactions: [],
        });
    }

    const userIds = [...new Set(transactions.map(t => t.userId))];
    const users = await User.find({ userId: { $in: userIds } })
      .select('userId name email')
            .lean();
    
    const userMap = new Map<number, { name: string; email: string }>();
    users.forEach(u => {
      userMap.set(u.userId, { name: u.name, email: u.email });
    });

    const enrichedTransactions = transactions.map(t => ({
      ...t,
      userName: userMap.get(t.userId)?.name || 'N/A',
      userEmail: userMap.get(t.userId)?.email || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
    });
  } catch (error: any) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import IBWithdrawal from '@/infrastructure/database/models/IBWithdrawal';
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

    const withdrawals = await IBWithdrawal.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (!withdrawals.length) {
        return NextResponse.json({
            success: true,
            withdrawals: [],
        });
    }

    const userIds = [...new Set(withdrawals.map(w => w.ib_user_id))];
    const users = await User.find({ userId: { $in: userIds } })
      .select('userId name')
      .lean();
    
    const userMap = new Map<number, { name: string }>();
    users.forEach(u => {
      userMap.set(u.userId, { name: u.name });
    });

    const enrichedWithdrawals = withdrawals.map(w => ({
      ...w,
      ib_user_name: userMap.get(w.ib_user_id)?.name || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      withdrawals: enrichedWithdrawals,
    });
  } catch (error: any) {
    console.error('Failed to fetch withdrawals:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch withdrawals' },
      { status: 500 }
    );
  }
}

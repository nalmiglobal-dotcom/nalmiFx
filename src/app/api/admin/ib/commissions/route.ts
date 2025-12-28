import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import IBCommission from '@/infrastructure/database/models/IBCommission';
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

    const commissions = await IBCommission.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (!commissions.length) {
      return NextResponse.json({
        success: true,
        commissions: [],
      });
    }

    const userIds = new Set<number>();
    commissions.forEach(c => {
      userIds.add(c.ib_user_id);
      userIds.add(c.referred_user_id);
    });

    const users = await User.find({ userId: { $in: Array.from(userIds) } })
      .select('userId name')
      .lean();
      
    const userMap = new Map<number, { name: string }>();
    users.forEach(u => {
      userMap.set(u.userId, { name: u.name });
    });

    const enrichedCommissions = commissions.map(c => ({
      ...c,
      ib_user_name: userMap.get(c.ib_user_id)?.name || 'N/A',
      referred_user_name: userMap.get(c.referred_user_id)?.name || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      commissions: enrichedCommissions,
    });
  } catch (error: any) {
    console.error('Failed to fetch commissions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch commissions' },
      { status: 500 }
    );
  }
}

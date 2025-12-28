import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import Trade from '@/infrastructure/database/models/Trade';
import IBCommission from '@/infrastructure/database/models/IBCommission';
import { getSession } from '@/domains/auth/services/auth.service';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  await connect();

  const user = await User.findOne({ userId: session.userId }).lean();
  if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

  if (!user.ib_code) {
    return NextResponse.json({ success: false, message: 'Not an IB' }, { status: 403 });
  }

  // total referred users
  const referredUsers = await User.find({ referred_by: user.userId }).select('userId').lean();
  const referredIds = referredUsers.map((u) => u.userId);
  const totalReferred = referredIds.length;

  // total active users: distinct referred users who have at least one trade
  let totalActive = 0;
  try {
    if (referredIds.length > 0) {
      const activeUserIds = await Trade.distinct('userId', { userId: { $in: referredIds } });
      totalActive = Array.isArray(activeUserIds) ? activeUserIds.length : 0;
    }
  } catch (e) {
    console.error('Error computing active users', e);
  }

  // total brokerage generated and total commission earned (from IBCommission records)
  const brokerageAgg = await IBCommission.aggregate([
    { $match: { ib_user_id: user.userId } },
    {
      $group: {
        _id: null,
        totalBrokerage: { $sum: '$brokerage' },
        totalCommission: { $sum: '$commission_amount' },
      },
    },
  ]);

  const totalBrokerage = brokerageAgg[0]?.totalBrokerage || 0;
  const totalCommission = brokerageAgg[0]?.totalCommission || 0;

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const referral_link = `${base}/login?ref=${user.ib_code}`;

  return NextResponse.json({
    success: true,
    data: {
      ib_code: user.ib_code,
      referral_link,
      totalReferred,
      totalActive,
      totalBrokerage,
      totalCommission,
    },
  });
}

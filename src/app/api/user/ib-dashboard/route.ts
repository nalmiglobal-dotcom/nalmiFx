import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import Trade from '@/infrastructure/database/models/Trade';
import IBCommission from '@/infrastructure/database/models/IBCommission';
import IBRequest from '@/infrastructure/database/models/IBRequest';
import { getSession } from '@/domains/auth/services/auth.service';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !session.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  await connect();

  const user = await User.findOne({ userId: session.userId }).lean();
  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  // Check if user has ib_code OR has an approved IB request
  let ibCode = user.ib_code;
  
  if (!ibCode) {
    // Check for approved IB request
    const ibRequest = await IBRequest.findOne({ 
      userId: session.userId, 
      status: 'approved' 
    }).lean();
    
    if (!ibRequest) {
      return NextResponse.json({ success: false, message: 'Not an approved IB' }, { status: 403 });
    }
    
    // User has approved request but no ib_code yet - generate one
    ibCode = `IB${session.userId}`;
    await User.updateOne({ userId: session.userId }, { $set: { ib_code: ibCode } });
  }

  // total referred users
  const referredUsers = await User.find({ referred_by: session.userId }).select('userId').lean();
  const referredIds = referredUsers.map((u: any) => u.userId);
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
    { $match: { ib_user_id: session.userId } },
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
  const referral_link = `${base}/login?ref=${ibCode}`;

  return NextResponse.json({
    success: true,
    data: {
      ib_code: ibCode,
      referral_link,
      totalReferred,
      totalActive,
      totalBrokerage,
      totalCommission,
    },
  });
}

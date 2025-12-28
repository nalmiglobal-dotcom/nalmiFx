import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import IBCommission from '@/infrastructure/database/models/IBCommission';

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

    // Get all users who are IBs (have ib_code)
    const ibUsers = await User.find({ ib_code: { $exists: true, $ne: null } })
      .select('userId name email ib_code isIB ib_commission_rate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Get commission stats for each IB
    const ibStats = await Promise.all(
      ibUsers.map(async (ib: any) => {
        // Count referred users
        const referredCount = await User.countDocuments({ referred_by: ib.userId });
        
        // Get total commission earned
        const commissionAgg = await IBCommission.aggregate([
          { $match: { ib_user_id: ib.userId } },
          { $group: { _id: null, total: { $sum: '$commission_amount' } } }
        ]);
        const totalCommission = commissionAgg[0]?.total || 0;

        return {
          ...ib,
          referredCount,
          totalCommission,
          ib_commission_rate: ib.ib_commission_rate || 0.1,
        };
      })
    );

    return NextResponse.json({
      success: true,
      accounts: ibStats,
    });
  } catch (error: any) {
    console.error('Failed to fetch IB accounts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch IB accounts' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
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

    const body = await req.json();
    const { userId, ib_commission_rate } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (typeof ib_commission_rate !== 'number' || ib_commission_rate < 0 || ib_commission_rate > 1) {
      return NextResponse.json(
        { success: false, message: 'Commission rate must be between 0 and 1' },
        { status: 400 }
      );
    }

    await connect();

    const user = await User.findOneAndUpdate(
      { userId, ib_code: { $exists: true, $ne: null } },
      { $set: { ib_commission_rate } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'IB account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commission rate updated successfully',
      account: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        ib_code: user.ib_code,
        ib_commission_rate: user.ib_commission_rate,
      },
    });
  } catch (error: any) {
    console.error('Failed to update IB commission rate:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update commission rate' },
      { status: 500 }
    );
  }
}

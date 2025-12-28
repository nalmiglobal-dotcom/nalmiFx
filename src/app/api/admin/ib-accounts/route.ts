import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();

    // find users who were referred by an IB
    const referred = await User.find({ referred_by: { $exists: true, $ne: null } })
      .select('userId name email referred_by createdAt')
      .lean();

    const results = await Promise.all(
      referred.map(async (u: any) => {
        const referrer = await User.findOne({ userId: u.referred_by })
          .select('userId name email ib_code')
          .lean();

        const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
        const referral_link = referrer && referrer.ib_code ? `${base}/login?ref=${referrer.ib_code}` : null;

        return {
          user: u,
          referrer: referrer || null,
          referral_link,
        };
      })
    );

    return NextResponse.json({ success: true, accounts: results });
  } catch (error: any) {
    console.error('IB accounts error', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch IB accounts' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import IBRequest from '@/infrastructure/database/models/IBRequest';
import User from '@/infrastructure/database/models/User';
import { getAdminSession } from '@/domains/auth/services/auth.service';

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'IB';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function GET(req: Request) {
  // List IB requests for admin
  const session = await getAdminSession();
  if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  await connect();
  const requests = await IBRequest.find().sort({ createdAt: -1 }).lean();

  // Optionally populate user basic info
  const withUsers = await Promise.all(
    requests.map(async (r) => {
      const user = await User.findOne({ userId: r.userId }).lean();
      return { ...r, user: user ? { name: user.name, email: user.email, userId: user.userId, kycVerified: user.kycVerified } : null };
    })
  );

  return NextResponse.json({ success: true, requests: withUsers });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, commission_percentage, reason } = body;
  if (!id || !action) return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });

  await connect();

  const reqDoc = await IBRequest.findById(id);
  if (!reqDoc) return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 });

  if (action === 'approve') {
    // generate unique code
    let code = generateReferralCode();
    // ensure uniqueness
    while (await User.findOne({ ib_code: code })) {
      code = generateReferralCode();
    }

    // update user
    const user = await User.findOne({ userId: reqDoc.userId });
    if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

    user.ib_code = code;
    // if commission_percentage provided use it, else keep what user requested
    if (typeof commission_percentage === 'number') {
      // store commission in request and apply
      reqDoc.commission_percentage = commission_percentage;
    }

    await user.save();

    reqDoc.status = 'approved';
    reqDoc.reviewed_at = new Date();
    await reqDoc.save();

    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const referral_link = `${base}/login?ref=${code}`;

    return NextResponse.json({ success: true, message: 'Approved', code, referral_link });
  }

  if (action === 'reject') {
    reqDoc.status = 'rejected';
    reqDoc.admin_reason = reason || '';
    reqDoc.reviewed_at = new Date();
    await reqDoc.save();
    return NextResponse.json({ success: true, message: 'Rejected' });
  }

  return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
}

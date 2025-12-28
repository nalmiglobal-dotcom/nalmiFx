import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import IBRequest from '@/infrastructure/database/models/IBRequest';
import User from '@/infrastructure/database/models/User';
import { getSession } from '@/domains/auth/services/auth.service';

export async function POST(req: Request) {
  // Create a new IB request for the logged-in user
  const session = await getSession();
  if (!session || !session.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { commission_structure_id, commission_percentage, agreed_terms_version } = body;

  await connect();

  const existing = await IBRequest.findOne({ userId: session.userId, status: { $in: ['pending', 'approved'] } });
  if (existing) {
    return NextResponse.json({ success: false, message: 'You already have an active or pending IB request' }, { status: 400 });
  }

  const reqDoc = new IBRequest({
    userId: session.userId,
    commission_structure_id,
    commission_percentage,
    agreed_terms_version,
    requested_at: new Date(),
    status: 'pending',
  });

  await reqDoc.save();

  return NextResponse.json({ success: true, request: reqDoc });
}

export async function GET(req: Request) {
  // Return the current user's IB request (if any)
  const session = await getSession();
  if (!session || !session.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  await connect();

  const reqDoc = await IBRequest.findOne({ userId: session.userId }).sort({ createdAt: -1 }).lean();
  if (!reqDoc) {
    return NextResponse.json({ success: true, request: null });
  }

  return NextResponse.json({ success: true, request: reqDoc });
}

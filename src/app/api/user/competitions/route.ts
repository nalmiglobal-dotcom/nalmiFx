import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import Account from '@/infrastructure/database/models/Account';

export async function GET(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // Filter by status if provided

    let query: any = {};
    if (status && ['upcoming', 'ongoing', 'ended'].includes(status)) {
      query.status = status;
    }

    const competitions = await Competition.find(query)
      .sort({ startDate: -1 })
      .lean();

    // Check which competitions the user has joined
    const userChallengeAccounts = await Account.find({
      userId: session.userId,
      accountType: 'challenge',
      status: 'active',
    }).lean();

    const competitionsWithJoinStatus = competitions.map((comp: any) => {
      const hasJoined = comp.participants.some((participantId: any) =>
        userChallengeAccounts.some((acc: any) => acc._id.toString() === participantId.toString())
      );
      return {
        ...comp,
        hasJoined,
        participantCount: comp.participants?.length || 0,
      };
    });

    return NextResponse.json({
      success: true,
      competitions: competitionsWithJoinStatus,
    });
  } catch (error: any) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}


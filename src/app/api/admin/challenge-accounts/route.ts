import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';

export async function GET(req: NextRequest) {
  try {
    await connect();
    let session = await getSession();

    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const result = searchParams.get('result');
    const challengeType = searchParams.get('challengeType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = {};
    if (status) query.status = status;
    if (result) query.result = result;
    if (challengeType) query.challengeType = challengeType;

    const total = await ChallengeAccount.countDocuments(query);
    const challenges = await ChallengeAccount.find(query)
      .populate('userId', 'name email userId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get statistics for prop firm structure
    const stats = await ChallengeAccount.aggregate([
      {
        $group: {
          _id: null,
          totalChallenges: { $sum: 1 },
          evaluationChallenges: { $sum: { $cond: [{ $eq: ['$status', 'evaluation'] }, 1, 0] } },
          fundedChallenges: { $sum: { $cond: [{ $eq: ['$status', 'funded'] }, 1, 0] } },
          breachedChallenges: { $sum: { $cond: [{ $eq: ['$status', 'breached'] }, 1, 0] } },
          expiredChallenges: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          totalRevenue: { $sum: '$price' },
          totalPayouts: { $sum: '$totalPayouts' },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      challenges,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalChallenges: 0,
        evaluationChallenges: 0,
        fundedChallenges: 0,
        breachedChallenges: 0,
        expiredChallenges: 0,
        totalRevenue: 0,
        totalPayouts: 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching challenge accounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connect();
    let session = await getSession();

    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, status, result } = await req.json();

    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Challenge ID required' }, { status: 400 });
    }

    const challenge = await ChallengeAccount.findById(challengeId);
    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 });
    }

    if (status) {
      challenge.status = status;
      
      // Handle status-specific updates
      if (status === 'funded') {
        challenge.fundedDate = new Date();
        // Mark all phases as passed
        if (challenge.phaseProgress) {
          challenge.phaseProgress.forEach((phase: any) => {
            if (phase.status === 'active' || phase.status === 'pending') {
              phase.status = 'passed';
              phase.passedAt = new Date();
            }
          });
        }
      } else if (status === 'breached') {
        challenge.breachDate = new Date();
        challenge.breachReason = 'ADMIN_MANUAL';
        challenge.breachDetails = 'Manually breached by admin';
      }
    }

    await challenge.save();

    return NextResponse.json({ success: true, challenge, message: 'Challenge updated successfully' });
  } catch (error: any) {
    console.error('Error updating challenge:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update challenge' },
      { status: 500 }
    );
  }
}

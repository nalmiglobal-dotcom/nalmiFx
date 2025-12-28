import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid competition ID' }, { status: 400 });
    }

    const competition = await Competition.findById(id).lean();

    if (!competition) {
      return NextResponse.json({ success: false, message: 'Competition not found' }, { status: 404 });
    }

    // Check if user has joined
    const hasJoined = (competition as any).participants?.some(
      (p: any) => p.toString() === session.odId?.toString()
    );

    // Find user's rank in leaderboard
    let userRank = null;
    if (hasJoined && (competition as any).leaderboard) {
      const userEntry = (competition as any).leaderboard.find(
        (entry: any) => entry.odType === 'user' && entry.odId?.toString() === session.odId?.toString()
      );
      if (userEntry) {
        userRank = userEntry.rank;
      }
    }

    return NextResponse.json({
      success: true,
      competition: {
        ...competition,
        hasJoined,
        userRank,
        participantCount: (competition as any).participants?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

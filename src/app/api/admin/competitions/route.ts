import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import MockTrader from '@/infrastructure/database/models/MockTrader';

export async function GET(req: NextRequest) {
  try {
    await connect();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const competitions = await Competition.find(query)
      .sort({ startDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      competitions,
    });
  } catch (error: any) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.name || !body.type || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, message: 'Name, type, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (new Date(body.endDate) <= new Date(body.startDate)) {
      return NextResponse.json(
        { success: false, message: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const now = new Date();
    let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
    if (new Date(body.endDate) < now) {
      status = 'ended';
    } else if (new Date(body.startDate) <= now && new Date(body.endDate) >= now) {
      status = 'ongoing';
    }

    const competition = new Competition({
      name: body.name,
      description: body.description || '',
      type: body.type,
      category: body.category || 'general',
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      entryOpenDate: body.entryOpenDate ? new Date(body.entryOpenDate) : new Date(body.startDate),
      entryCloseDate: body.entryCloseDate ? new Date(body.entryCloseDate) : new Date(body.startDate),
      entryFee: body.entryFee || 0,
      prizePool: body.prizePool || { total: 0 },
      winnerPrizes: body.winnerPrizes || { first: 0, second: 0, third: 0 },
      maxParticipants: body.maxParticipants,
      rules: body.rules || {},
      organizer: body.organizer || 'NalmiFXs',
      tags: body.tags || [],
      status,
      participants: [],
      leaderboard: [],
      isActive: true,
    });

    await competition.save();

    // Generate mock leaderboard for new competition
    const mockTraders = await MockTrader.find({ isActive: true });
    if (mockTraders.length > 0) {
      const leaderboard = mockTraders.map((trader: any) => {
        const fluctuation = () => 1 + (Math.random() - 0.5) * 2 * trader.volatility;
        return {
          odType: 'mock',
          odId: trader._id,
          odName: trader.name,
          odCountry: trader.country,
          trades: Math.round(trader.baseTrades * fluctuation()),
          winRatio: Math.min(100, Math.max(0, Math.round(trader.baseWinRatio * fluctuation()))),
          profit: Math.round(trader.baseProfit * fluctuation() * 100) / 100,
          profitPercentage: Math.round(trader.baseProfitPercentage * fluctuation() * 100) / 100,
          rank: 0,
        };
      }).sort((a: any, b: any) => b.profitPercentage - a.profitPercentage)
        .map((entry: any, index: number) => ({ ...entry, rank: index + 1 }));

      competition.leaderboard = leaderboard;
      await competition.save();
    }

    return NextResponse.json({
      success: true,
      competition,
      message: 'Competition created successfully',
    });
  } catch (error: any) {
    console.error('Error creating competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create competition' },
      { status: 500 }
    );
  }
}


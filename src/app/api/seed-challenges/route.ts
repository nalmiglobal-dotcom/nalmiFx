import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';

// Seed sample challenges for the logged-in user
export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find User by userId (number) to get the User's _id (ObjectId)
    const user = await User.findOne({ userId: session.userId }).select('_id');
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if user already has challenges
    const existingCount = await ChallengeAccount.countDocuments({ userId: user._id });
    if (existingCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `User already has ${existingCount} challenges`,
        count: existingCount 
      });
    }

    // Create sample challenges
    const sampleChallenges = [
      {
        userId: user._id,
        challengeType: 'two_step',
        profitTarget: 8,
        accountSize: 10000,
        price: 99,
        status: 'active',
        result: 'pending',
        phase: 1,
        accountNumber: `CH${Date.now().toString().slice(-6)}A1`,
        platform: 'MetaTrader 5',
        startingBalance: 10000,
        currentBalance: 10000,
        targetBalance: 10800,
        targetProfit: 800,
        currentProfit: 0,
        currentProfitPercent: 0,
        tradesCount: 0,
        winningTrades: 0,
        losingTrades: 0,
        startDate: new Date(),
      },
      {
        userId: user._id,
        challengeType: 'one_step',
        profitTarget: 10,
        accountSize: 25000,
        price: 199,
        status: 'active',
        result: 'pending',
        phase: 1,
        accountNumber: `CH${Date.now().toString().slice(-6)}B2`,
        platform: 'MetaTrader 5',
        startingBalance: 25000,
        currentBalance: 25000,
        targetBalance: 27500,
        targetProfit: 2500,
        currentProfit: 0,
        currentProfitPercent: 0,
        tradesCount: 0,
        winningTrades: 0,
        losingTrades: 0,
        startDate: new Date(),
      },
      {
        userId: user._id,
        challengeType: 'zero_step',
        profitTarget: 8,
        accountSize: 5000,
        price: 49,
        status: 'passed',
        result: 'win',
        phase: 0,
        accountNumber: `CH${Date.now().toString().slice(-6)}C3`,
        platform: 'MetaTrader 5',
        startingBalance: 5000,
        currentBalance: 5400,
        targetBalance: 5400,
        targetProfit: 400,
        currentProfit: 400,
        currentProfitPercent: 8,
        tradesCount: 3,
        winningTrades: 2,
        losingTrades: 1,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedDate: new Date(),
      },
    ];

    await ChallengeAccount.insertMany(sampleChallenges);

    return NextResponse.json({
      success: true,
      message: `Created ${sampleChallenges.length} sample challenges`,
      count: sampleChallenges.length,
    });
  } catch (error: any) {
    console.error('Error seeding challenges:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to seed challenges' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find User by userId (number) to get the User's _id (ObjectId)
    const user = await User.findOne({ userId: session.userId }).select('_id');
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Use User's _id (ObjectId) to query ChallengeAccount
    const challenges = await ChallengeAccount.find({ userId: user._id });
    return NextResponse.json({
      success: true,
      count: challenges.length,
      challenges,
    });
  } catch (error: any) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

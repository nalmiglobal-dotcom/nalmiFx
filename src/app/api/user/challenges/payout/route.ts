import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';

// Request a payout from a funded challenge account
export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, amount } = await req.json();

    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Challenge ID required' }, { status: 400 });
    }

    const user = await User.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const challenge = await ChallengeAccount.findOne({
      _id: challengeId,
      userId: user._id,
      status: 'funded',
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Funded challenge account not found' }, { status: 404 });
    }

    const settings = await (ChallengeSettings as any).getSettings();
    const payoutOptionConfig = settings.payoutOptions.find(
      (p: any) => p.id === challenge.payoutOption
    );

    if (!payoutOptionConfig) {
      return NextResponse.json({ success: false, message: 'Invalid payout option' }, { status: 400 });
    }

    // Calculate available profit for payout
    const availableProfit = challenge.currentBalance - challenge.initialBalance;
    
    if (availableProfit <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No profit available for payout. Your balance must exceed your initial balance.' 
      }, { status: 400 });
    }

    // Check minimum payout requirement
    const minPayoutAmount = challenge.initialBalance * (payoutOptionConfig.minPayout / 100);
    const requestedAmount = amount || availableProfit;

    if (requestedAmount < minPayoutAmount) {
      return NextResponse.json({ 
        success: false, 
        message: `Minimum payout is ${payoutOptionConfig.minPayout}% of initial balance ($${minPayoutAmount.toFixed(2)})` 
      }, { status: 400 });
    }

    if (requestedAmount > availableProfit) {
      return NextResponse.json({ 
        success: false, 
        message: `Requested amount exceeds available profit ($${availableProfit.toFixed(2)})` 
      }, { status: 400 });
    }

    // Check consistency score requirement
    if (payoutOptionConfig.consistencyRequired) {
      if (challenge.consistencyScore < payoutOptionConfig.consistencyScore) {
        return NextResponse.json({ 
          success: false, 
          message: `This payout option requires a consistency score of ${payoutOptionConfig.consistencyScore}%. Your current score is ${challenge.consistencyScore.toFixed(1)}%.` 
        }, { status: 400 });
      }
    }

    // Check payout frequency
    if (challenge.nextPayoutDate && new Date() < new Date(challenge.nextPayoutDate)) {
      return NextResponse.json({ 
        success: false, 
        message: `Next payout available on ${new Date(challenge.nextPayoutDate).toLocaleDateString()}` 
      }, { status: 400 });
    }

    // Calculate payout with profit split
    const profitSplit = payoutOptionConfig.profitSplit / 100;
    const payoutAmount = requestedAmount * profitSplit;
    const firmShare = requestedAmount - payoutAmount;

    // Generate payout ID
    const payoutId = `PO${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Create payout record
    const payoutRecord = {
      payoutId,
      amount: payoutAmount,
      profitSplit: payoutOptionConfig.profitSplit,
      payoutOption: challenge.payoutOption,
      status: 'pending',
      requestedAt: new Date(),
    };

    challenge.payoutHistory.push(payoutRecord);

    // Calculate next payout date based on frequency
    let nextPayoutDate = new Date();
    switch (payoutOptionConfig.frequency) {
      case 'weekly':
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
        break;
      case 'bi_weekly':
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
        break;
      case 'monthly':
        nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
        break;
      case 'on_demand':
        // No restriction for on-demand
        nextPayoutDate = null as any;
        break;
    }
    challenge.nextPayoutDate = nextPayoutDate;

    await challenge.save();

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout: {
        payoutId,
        requestedAmount,
        profitSplit: payoutOptionConfig.profitSplit,
        payoutAmount,
        firmShare,
        status: 'pending',
        payoutOption: payoutOptionConfig.name,
        nextPayoutDate: challenge.nextPayoutDate,
      },
    });
  } catch (error: any) {
    console.error('Error requesting payout:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to request payout' },
      { status: 500 }
    );
  }
}

// Get payout history for a challenge
export async function GET(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const challengeId = searchParams.get('challengeId');

    if (!challengeId) {
      return NextResponse.json({ success: false, message: 'Challenge ID required' }, { status: 400 });
    }

    const user = await User.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const challenge = await ChallengeAccount.findOne({
      _id: challengeId,
      userId: user._id,
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 });
    }

    const settings = await (ChallengeSettings as any).getSettings();
    const payoutOptionConfig = settings.payoutOptions.find(
      (p: any) => p.id === challenge.payoutOption
    );

    const availableProfit = Math.max(0, challenge.currentBalance - challenge.initialBalance);
    const profitSplit = payoutOptionConfig?.profitSplit || 80;
    const potentialPayout = availableProfit * (profitSplit / 100);

    return NextResponse.json({
      success: true,
      payoutInfo: {
        status: challenge.status,
        payoutOption: challenge.payoutOption,
        payoutOptionName: payoutOptionConfig?.name || 'Unknown',
        profitSplit,
        availableProfit,
        potentialPayout,
        payoutsCount: challenge.payoutsCount,
        totalPayouts: challenge.totalPayouts,
        nextPayoutDate: challenge.nextPayoutDate,
        consistencyScore: challenge.consistencyScore,
        consistencyRequired: payoutOptionConfig?.consistencyRequired || false,
        requiredConsistencyScore: payoutOptionConfig?.consistencyScore || 0,
      },
      payoutHistory: challenge.payoutHistory,
    });
  } catch (error: any) {
    console.error('Error fetching payout info:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch payout info' },
      { status: 500 }
    );
  }
}

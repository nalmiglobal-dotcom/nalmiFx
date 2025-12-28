import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';
import Wallet from '@/infrastructure/database/models/Wallet';

export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeType, accountSize, price, payoutOption } = await req.json();

    // Validate inputs
    if (!challengeType || !accountSize || !price) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Get challenge settings
    const settings = await (ChallengeSettings as any).getSettings();
    
    // Check if challengeTypes exists
    if (!settings.challengeTypes || settings.challengeTypes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Challenge settings not configured. Please contact admin to set up challenge types.' 
      }, { status: 400 });
    }
    
    const challengeTypeConfig = settings.challengeTypes.find((t: any) => t.id === challengeType);
    
    if (!challengeTypeConfig || !challengeTypeConfig.enabled) {
      return NextResponse.json({ success: false, message: 'Invalid or disabled challenge type' }, { status: 400 });
    }

    // Check wallet balance and user restrictions
    const user = await User.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ userId: session.userId });
    if (!wallet) {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, message: 'Your account has been banned.' }, { status: 403 });
    }

    if (user.isReadOnly) {
      return NextResponse.json({ success: false, message: 'Your account is in read-only mode. You cannot purchase challenges.' }, { status: 403 });
    }

    if (wallet.balance < price) {
      return NextResponse.json({ success: false, message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Deduct from wallet
    wallet.balance -= price;
    wallet.updatedAt = new Date();
    await wallet.save();

    // Generate account number
    const accountNumber = `CH${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // Build phase progress from challenge type config
    const phases = challengeTypeConfig.phases || [];
    const totalPhases = phases.length;
    const isInstantFunding = totalPhases === 0;
    
    const phaseProgress = phases.map((phase: any, index: number) => ({
      phase: phase.phase,
      name: phase.name,
      profitTarget: phase.profitTarget,
      profitAchieved: 0,
      profitPercent: 0,
      tradingDays: 0,
      minTradingDays: phase.minTradingDays,
      startDate: index === 0 ? new Date() : null,
      status: index === 0 ? 'active' : 'pending',
    }));

    // Calculate loss limits
    const totalLossLimit = accountSize * (1 - settings.maxTotalLoss / 100);
    const dailyLossLimit = accountSize * (settings.maxDailyLoss / 100);

    // Create challenge account with prop firm structure
    const challengeAccount = await ChallengeAccount.create({
      userId: user._id,
      challengeType,
      accountSize,
      price,
      accountNumber,
      platform: 'MetaTrader 5',
      
      // Status
      status: isInstantFunding ? 'funded' : 'evaluation',
      currentPhase: isInstantFunding ? 0 : 1,
      totalPhases,
      phaseProgress,
      
      // Balance
      initialBalance: accountSize,
      currentBalance: accountSize,
      highWaterMark: accountSize,
      currentEquity: accountSize,
      floatingPnL: 0,
      realizedPnL: 0,
      totalProfitPercent: 0,
      
      // Risk Management
      maxDailyLoss: settings.maxDailyLoss,
      maxTotalLoss: settings.maxTotalLoss,
      maxSingleTradeLoss: settings.maxSingleTradeLoss,
      dailyLossLimit,
      totalLossLimit,
      currentDailyLoss: 0,
      currentDrawdown: 0,
      maxDrawdownReached: 0,
      
      // Trading Stats
      tradingDaysCount: 0,
      tradingDays: [],
      tradesCount: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      consistencyScore: 0,
      
      // Payout
      payoutOption: payoutOption || settings.defaultPayoutOption,
      payoutsCount: 0,
      totalPayouts: 0,
      payoutHistory: [],
      
      // Scaling
      scalingLevel: 0,
      scaledBalance: accountSize,
      
      // Dates
      startDate: new Date(),
      lastActivityDate: new Date(),
      fundedDate: isInstantFunding ? new Date() : null,
    });

    return NextResponse.json({
      success: true,
      message: isInstantFunding 
        ? 'Instant funding account created successfully!' 
        : 'Challenge purchased successfully! Complete the evaluation phases to get funded.',
      challenge: {
        id: challengeAccount._id,
        accountNumber: challengeAccount.accountNumber,
        challengeType,
        challengeTypeName: challengeTypeConfig.name,
        accountSize,
        status: challengeAccount.status,
        currentPhase: challengeAccount.currentPhase,
        totalPhases,
        phaseProgress: challengeAccount.phaseProgress,
      },
    });
  } catch (error: any) {
    console.error('Error purchasing challenge:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to purchase challenge' },
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
    const challenges = await ChallengeAccount.find({ userId: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
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

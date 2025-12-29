import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';
import Trade from '@/infrastructure/database/models/Trade';

// This API checks for challenge inactivity and expires them
// Should be called periodically (e.g., via cron job or scheduled task)
export async function POST() {
  try {
    await connect();

    const settings = await (ChallengeSettings as any).getSettings();
    const inactivityDays = settings?.inactivityDays || 30;
    
    // Calculate the cutoff date for inactivity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

    // Find all active challenges that haven't had activity since cutoff
    const inactiveChallenges = await ChallengeAccount.find({
      status: { $in: ['evaluation', 'funded'] },
      lastActivityDate: { $lt: cutoffDate },
    });

    const expiredChallenges: any[] = [];

    for (const challenge of inactiveChallenges) {
      // Close any open trades for this challenge
      const openTrades = await Trade.find({
        challengeAccountId: challenge._id,
        status: 'open',
      });

      for (const trade of openTrades) {
        await Trade.findByIdAndUpdate(trade._id, {
          status: 'closed',
          closedAt: new Date(),
          realizedPnL: 0,
        });
      }

      // Mark challenge as expired due to inactivity
      challenge.status = 'expired';
      challenge.breachReason = 'INACTIVITY';
      challenge.breachDate = new Date();
      challenge.breachDetails = `Account expired due to ${inactivityDays} days of inactivity. Last activity: ${challenge.lastActivityDate?.toISOString()}`;
      
      await challenge.save();

      expiredChallenges.push({
        challengeId: challenge._id,
        accountNumber: challenge.accountNumber,
        lastActivityDate: challenge.lastActivityDate,
        daysSinceActivity: Math.floor((Date.now() - new Date(challenge.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)),
      });
    }

    // Also check for trading period expiry (if tradingPeriodDays > 0)
    const challengesWithPeriodLimit = await ChallengeAccount.find({
      status: 'evaluation',
      'phaseProgress.tradingPeriodDays': { $gt: 0 },
    });

    for (const challenge of challengesWithPeriodLimit) {
      const currentPhaseIndex = challenge.currentPhase - 1;
      const currentPhase = challenge.phaseProgress[currentPhaseIndex];
      
      if (currentPhase && currentPhase.status === 'active' && currentPhase.startDate) {
        const tradingPeriodDays = currentPhase.tradingPeriodDays || 0;
        if (tradingPeriodDays > 0) {
          const phaseStartDate = new Date(currentPhase.startDate);
          const phaseEndDate = new Date(phaseStartDate);
          phaseEndDate.setDate(phaseEndDate.getDate() + tradingPeriodDays);
          
          if (new Date() > phaseEndDate) {
            // Check if profit target was met
            const profitTargetMet = challenge.totalProfitPercent >= currentPhase.profitTarget;
            const tradingDaysMet = challenge.tradingDaysCount >= currentPhase.minTradingDays;
            
            if (!profitTargetMet || !tradingDaysMet) {
              // Close any open trades
              const openTrades = await Trade.find({
                challengeAccountId: challenge._id,
                status: 'open',
              });

              for (const trade of openTrades) {
                await Trade.findByIdAndUpdate(trade._id, {
                  status: 'closed',
                  closedAt: new Date(),
                  realizedPnL: 0,
                });
              }

              // Mark phase as failed and challenge as breached
              currentPhase.status = 'failed';
              currentPhase.endDate = new Date();
              
              challenge.status = 'breached';
              challenge.breachReason = 'TRADING_PERIOD_EXPIRED';
              challenge.breachDate = new Date();
              challenge.breachDetails = `Trading period of ${tradingPeriodDays} days expired without meeting targets. Profit: ${challenge.totalProfitPercent.toFixed(2)}% (target: ${currentPhase.profitTarget}%), Trading days: ${challenge.tradingDaysCount} (min: ${currentPhase.minTradingDays})`;
              
              await challenge.save();

              expiredChallenges.push({
                challengeId: challenge._id,
                accountNumber: challenge.accountNumber,
                reason: 'TRADING_PERIOD_EXPIRED',
                phase: challenge.currentPhase,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${inactiveChallenges.length + challengesWithPeriodLimit.length} challenges`,
      expiredCount: expiredChallenges.length,
      expiredChallenges,
      inactivityDays,
    });
  } catch (error: any) {
    console.error('Error checking challenge expiry:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to check challenge expiry' },
      { status: 500 }
    );
  }
}

// GET - Get expiry status for challenges
export async function GET() {
  try {
    await connect();

    const settings = await (ChallengeSettings as any).getSettings();
    const inactivityDays = settings?.inactivityDays || 30;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

    // Find challenges at risk of expiry (inactive for more than 80% of inactivity period)
    const warningCutoff = new Date();
    warningCutoff.setDate(warningCutoff.getDate() - Math.floor(inactivityDays * 0.8));

    const atRiskChallenges = await ChallengeAccount.find({
      status: { $in: ['evaluation', 'funded'] },
      lastActivityDate: { $lt: warningCutoff, $gte: cutoffDate },
    }).select('_id accountNumber lastActivityDate status currentPhase');

    const expiredChallenges = await ChallengeAccount.find({
      status: { $in: ['evaluation', 'funded'] },
      lastActivityDate: { $lt: cutoffDate },
    }).select('_id accountNumber lastActivityDate status currentPhase');

    return NextResponse.json({
      success: true,
      inactivityDays,
      atRiskCount: atRiskChallenges.length,
      atRiskChallenges: atRiskChallenges.map(c => ({
        challengeId: c._id,
        accountNumber: c.accountNumber,
        lastActivityDate: c.lastActivityDate,
        daysSinceActivity: Math.floor((Date.now() - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)),
        daysUntilExpiry: inactivityDays - Math.floor((Date.now() - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      expiredCount: expiredChallenges.length,
      expiredChallenges: expiredChallenges.map(c => ({
        challengeId: c._id,
        accountNumber: c.accountNumber,
        lastActivityDate: c.lastActivityDate,
        daysSinceActivity: Math.floor((Date.now() - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error: any) {
    console.error('Error getting challenge expiry status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get expiry status' },
      { status: 500 }
    );
  }
}

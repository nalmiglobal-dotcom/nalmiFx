import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';

// This API updates challenge account after a trade is closed
// Handles: phase progression, breach detection, daily stats, trading days
export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, trade } = await req.json();

    if (!challengeId || !trade) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const user = await User.findOne({ userId: session.userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const challenge = await ChallengeAccount.findOne({
      _id: challengeId,
      userId: user._id,
      status: { $in: ['evaluation', 'funded'] },
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Active challenge not found' }, { status: 404 });
    }

    const settings = await (ChallengeSettings as any).getSettings();
    const tradeProfit = trade.profit || 0;
    const tradeProfitPercent = (tradeProfit / challenge.initialBalance) * 100;

    // Update balance and equity
    const previousBalance = challenge.currentBalance;
    challenge.currentBalance += tradeProfit;
    challenge.realizedPnL += tradeProfit;
    challenge.totalProfitPercent = ((challenge.currentBalance - challenge.initialBalance) / challenge.initialBalance) * 100;
    challenge.lastActivityDate = new Date();

    // Update high water mark
    if (challenge.currentBalance > challenge.highWaterMark) {
      challenge.highWaterMark = challenge.currentBalance;
    }

    // Calculate drawdown
    challenge.currentDrawdown = ((challenge.highWaterMark - challenge.currentBalance) / challenge.highWaterMark) * 100;
    if (challenge.currentDrawdown > challenge.maxDrawdownReached) {
      challenge.maxDrawdownReached = challenge.currentDrawdown;
    }

    // Update daily loss tracking
    const today = new Date().toDateString();
    let todayStats = challenge.dailyStats.find((d: any) => new Date(d.date).toDateString() === today);
    
    if (!todayStats) {
      todayStats = {
        date: new Date(),
        startingEquity: previousBalance,
        endingEquity: challenge.currentBalance,
        highEquity: Math.max(previousBalance, challenge.currentBalance),
        lowEquity: Math.min(previousBalance, challenge.currentBalance),
        dailyPnL: tradeProfit,
        dailyPnLPercent: tradeProfitPercent,
        tradesCount: 1,
        breached: false,
      };
      challenge.dailyStats.push(todayStats);
    } else {
      todayStats.endingEquity = challenge.currentBalance;
      todayStats.highEquity = Math.max(todayStats.highEquity, challenge.currentBalance);
      todayStats.lowEquity = Math.min(todayStats.lowEquity, challenge.currentBalance);
      todayStats.dailyPnL += tradeProfit;
      todayStats.dailyPnLPercent = (todayStats.dailyPnL / challenge.initialBalance) * 100;
      todayStats.tradesCount += 1;
    }

    // Update trading days
    const tradingDayExists = challenge.tradingDays.some(
      (d: Date) => new Date(d).toDateString() === today
    );
    if (!tradingDayExists) {
      challenge.tradingDays.push(new Date());
      challenge.tradingDaysCount += 1;
    }

    // Update trade stats
    challenge.tradesCount += 1;
    if (tradeProfit > 0) {
      challenge.winningTrades += 1;
      if (tradeProfit > challenge.largestWin) {
        challenge.largestWin = tradeProfit;
      }
    } else if (tradeProfit < 0) {
      challenge.losingTrades += 1;
      if (Math.abs(tradeProfit) > challenge.largestLoss) {
        challenge.largestLoss = Math.abs(tradeProfit);
      }
    }
    challenge.winRate = challenge.tradesCount > 0 
      ? (challenge.winningTrades / challenge.tradesCount) * 100 
      : 0;

    // Add to trade history
    challenge.tradeHistory.push({
      tradeId: trade._id,
      symbol: trade.symbol,
      type: trade.type,
      side: trade.side,
      lots: trade.lots || trade.volume,
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      profit: tradeProfit,
      profitPercent: tradeProfitPercent,
      openedAt: trade.openedAt || trade.createdAt,
      closedAt: trade.closedAt || new Date(),
    });

    // Check for breach conditions
    let breached = false;
    let breachReason = '';
    let breachDetails = '';

    // 1. Check max total loss (account cannot fall below totalLossLimit)
    if (challenge.currentBalance <= challenge.totalLossLimit) {
      breached = true;
      breachReason = 'MAX_TOTAL_LOSS';
      breachDetails = `Account balance ($${challenge.currentBalance.toFixed(2)}) fell below the maximum loss limit ($${challenge.totalLossLimit.toFixed(2)})`;
    }

    // 2. Check daily loss limit
    if (todayStats.dailyPnL < 0 && Math.abs(todayStats.dailyPnL) >= challenge.dailyLossLimit) {
      breached = true;
      breachReason = 'MAX_DAILY_LOSS';
      breachDetails = `Daily loss ($${Math.abs(todayStats.dailyPnL).toFixed(2)}) exceeded the ${challenge.maxDailyLoss}% daily limit ($${challenge.dailyLossLimit.toFixed(2)})`;
      todayStats.breached = true;
    }

    // 3. Check single trade loss (for funded accounts only)
    if (challenge.status === 'funded' && tradeProfit < 0) {
      const singleTradeLossLimit = challenge.initialBalance * (challenge.maxSingleTradeLoss / 100);
      if (Math.abs(tradeProfit) > singleTradeLossLimit) {
        breached = true;
        breachReason = 'MAX_SINGLE_TRADE_LOSS';
        breachDetails = `Single trade loss ($${Math.abs(tradeProfit).toFixed(2)}) exceeded the ${challenge.maxSingleTradeLoss}% limit ($${singleTradeLossLimit.toFixed(2)})`;
      }
    }

    if (breached) {
      challenge.status = 'breached';
      challenge.breachReason = breachReason;
      challenge.breachDate = new Date();
      challenge.breachDetails = breachDetails;
      
      await challenge.save();
      
      return NextResponse.json({
        success: true,
        breached: true,
        message: `Challenge breached: ${breachDetails}`,
        challenge: {
          id: challenge._id,
          status: challenge.status,
          breachReason,
          breachDetails,
          currentBalance: challenge.currentBalance,
        },
      });
    }

    // Check for phase completion (evaluation accounts only)
    if (challenge.status === 'evaluation' && challenge.phaseProgress.length > 0) {
      const currentPhaseIndex = challenge.currentPhase - 1;
      const currentPhaseProgress = challenge.phaseProgress[currentPhaseIndex];
      
      if (currentPhaseProgress && currentPhaseProgress.status === 'active') {
        // Update phase profit
        currentPhaseProgress.profitAchieved = challenge.currentBalance - challenge.initialBalance;
        currentPhaseProgress.profitPercent = challenge.totalProfitPercent;
        currentPhaseProgress.tradingDays = challenge.tradingDaysCount;

        // Check if phase is passed
        const profitTargetMet = challenge.totalProfitPercent >= currentPhaseProgress.profitTarget;
        const tradingDaysMet = challenge.tradingDaysCount >= currentPhaseProgress.minTradingDays;

        if (profitTargetMet && tradingDaysMet) {
          currentPhaseProgress.status = 'passed';
          currentPhaseProgress.passedAt = new Date();
          currentPhaseProgress.endDate = new Date();

          // Check if there are more phases
          if (challenge.currentPhase < challenge.totalPhases) {
            // Move to next phase
            challenge.currentPhase += 1;
            const nextPhaseProgress = challenge.phaseProgress[challenge.currentPhase - 1];
            if (nextPhaseProgress) {
              nextPhaseProgress.status = 'active';
              nextPhaseProgress.startDate = new Date();
            }
            
            // Reset balance for next phase (optional - some firms keep the profit)
            // challenge.currentBalance = challenge.initialBalance;
            // challenge.realizedPnL = 0;
            // challenge.totalProfitPercent = 0;
            
            await challenge.save();
            
            return NextResponse.json({
              success: true,
              phaseCompleted: true,
              message: `Congratulations! You passed ${currentPhaseProgress.name}! Moving to Phase ${challenge.currentPhase}.`,
              challenge: {
                id: challenge._id,
                status: challenge.status,
                currentPhase: challenge.currentPhase,
                totalPhases: challenge.totalPhases,
                phaseProgress: challenge.phaseProgress,
                currentBalance: challenge.currentBalance,
              },
            });
          } else {
            // All phases completed - account is now funded!
            challenge.status = 'funded';
            challenge.fundedDate = new Date();
            
            // Refund challenge fee if enabled
            if (settings.refundOnPass && settings.refundPercentage > 0) {
              const refundAmount = challenge.price * (settings.refundPercentage / 100);
              const challengeUser = await User.findById(challenge.userId);
              if (challengeUser) {
                challengeUser.walletBalance += refundAmount;
                await challengeUser.save();
              }
            }
            
            await challenge.save();
            
            return NextResponse.json({
              success: true,
              funded: true,
              message: `🎉 Congratulations! You passed all evaluation phases! Your account is now FUNDED!`,
              challenge: {
                id: challenge._id,
                status: challenge.status,
                currentPhase: challenge.currentPhase,
                totalPhases: challenge.totalPhases,
                phaseProgress: challenge.phaseProgress,
                currentBalance: challenge.currentBalance,
                fundedDate: challenge.fundedDate,
              },
            });
          }
        }
      }
    }

    await challenge.save();

    return NextResponse.json({
      success: true,
      message: 'Trade recorded successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status,
        currentPhase: challenge.currentPhase,
        totalPhases: challenge.totalPhases,
        currentBalance: challenge.currentBalance,
        totalProfitPercent: challenge.totalProfitPercent,
        phaseProgress: challenge.phaseProgress,
        tradingDaysCount: challenge.tradingDaysCount,
      },
    });
  } catch (error: any) {
    console.error('Error updating challenge trade:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update challenge' },
      { status: 500 }
    );
  }
}

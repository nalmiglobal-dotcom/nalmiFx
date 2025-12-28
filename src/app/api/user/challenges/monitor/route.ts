import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import Trade from '@/infrastructure/database/models/Trade';

// This API monitors trades for challenge accounts and determines win/lose
// Win condition: Hit exactly the target profit percentage (within 0.5% tolerance)
// Lose conditions:
// 1. Loss in trade (negative profit)
// 2. Profit exceeds target by more than 0.5%

export async function POST(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, tradeId } = await req.json();

    // Get the challenge account
    const challenge = await ChallengeAccount.findOne({
      _id: challengeId,
      userId: session.userId,
      status: 'active',
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Active challenge not found' }, { status: 404 });
    }

    // Get the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return NextResponse.json({ success: false, message: 'Trade not found' }, { status: 404 });
    }

    // Check if trade is closed
    if (trade.status !== 'closed') {
      return NextResponse.json({ success: false, message: 'Trade is not closed yet' }, { status: 400 });
    }

    const tradeProfit = trade.profit || 0;
    const profitPercent = (tradeProfit / challenge.accountSize) * 100;
    const targetPercent = challenge.profitTarget;
    
    // Tolerance for exact target (0.5%)
    const tolerance = 0.5;
    
    let result: 'win' | 'lose' = 'lose';
    let status: 'passed' | 'failed' = 'failed';
    let message = '';

    // Determine result
    if (tradeProfit < 0) {
      // Loss in trade - LOSE
      result = 'lose';
      status = 'failed';
      message = `Trade resulted in loss of $${Math.abs(tradeProfit).toFixed(2)}. Challenge failed.`;
    } else if (profitPercent >= targetPercent - tolerance && profitPercent <= targetPercent + tolerance) {
      // Hit the target within tolerance - WIN
      result = 'win';
      status = 'passed';
      message = `Congratulations! You hit the ${targetPercent}% target with ${profitPercent.toFixed(2)}% profit. Challenge passed!`;
    } else if (profitPercent > targetPercent + tolerance) {
      // Exceeded target by more than tolerance - LOSE
      result = 'lose';
      status = 'failed';
      message = `Profit of ${profitPercent.toFixed(2)}% exceeded the ${targetPercent}% target. Must be exactly ${targetPercent}% (±${tolerance}%). Challenge failed.`;
    } else {
      // Under target but positive - continue trading (no update to status)
      return NextResponse.json({
        success: true,
        message: `Trade profit: ${profitPercent.toFixed(2)}%. Target: ${targetPercent}%. Keep trading to reach the target.`,
        challenge: {
          currentProfit: tradeProfit,
          currentProfitPercent: profitPercent,
          targetProfit: challenge.targetProfit,
          targetPercent: challenge.profitTarget,
          status: 'active',
          result: 'pending',
        },
      });
    }

    // Update challenge with result
    challenge.currentProfit = tradeProfit;
    challenge.currentProfitPercent = profitPercent;
    challenge.currentBalance = challenge.accountSize + tradeProfit;
    challenge.tradesCount += 1;
    challenge.status = status;
    challenge.result = result;
    challenge.completedDate = new Date();

    // Add to trade history
    challenge.tradeHistory.push({
      tradeId: trade._id,
      symbol: trade.symbol,
      type: trade.type,
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      profit: tradeProfit,
      profitPercent: profitPercent,
      result: result,
      closedAt: new Date(),
    });

    if (tradeProfit > 0) {
      challenge.winningTrades += 1;
    } else {
      challenge.losingTrades += 1;
    }

    await challenge.save();

    return NextResponse.json({
      success: true,
      message,
      challenge: {
        id: challenge._id,
        accountNumber: challenge.accountNumber,
        status: challenge.status,
        result: challenge.result,
        currentProfit: challenge.currentProfit,
        currentProfitPercent: challenge.currentProfitPercent,
        targetProfit: challenge.targetProfit,
        targetPercent: challenge.profitTarget,
      },
    });
  } catch (error: any) {
    console.error('Error monitoring challenge:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to monitor challenge' },
      { status: 500 }
    );
  }
}

// GET - Get challenge status with trade monitoring info
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

    const challenge = await ChallengeAccount.findOne({
      _id: challengeId,
      userId: session.userId,
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      challenge: {
        id: challenge._id,
        accountNumber: challenge.accountNumber,
        challengeType: challenge.challengeType,
        accountSize: challenge.accountSize,
        profitTarget: challenge.profitTarget,
        targetProfit: challenge.targetProfit,
        targetBalance: challenge.targetBalance,
        currentBalance: challenge.currentBalance,
        currentProfit: challenge.currentProfit,
        currentProfitPercent: challenge.currentProfitPercent,
        status: challenge.status,
        result: challenge.result,
        tradesCount: challenge.tradesCount,
        winningTrades: challenge.winningTrades,
        losingTrades: challenge.losingTrades,
        tradeHistory: challenge.tradeHistory,
        startDate: challenge.startDate,
        completedDate: challenge.completedDate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching challenge status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch challenge status' },
      { status: 500 }
    );
  }
}

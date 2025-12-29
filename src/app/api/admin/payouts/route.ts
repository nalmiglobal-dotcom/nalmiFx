import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import ChallengeAccount from '@/infrastructure/database/models/ChallengeAccount';
import Wallet from '@/infrastructure/database/models/Wallet';
import User from '@/infrastructure/database/models/User';
import Transaction from '@/infrastructure/database/models/Transaction';

export async function PUT(req: NextRequest) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, payoutId, action } = await req.json();

    if (!challengeId || !payoutId || !action) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    // Find challenge account
    const challenge = await ChallengeAccount.findById(challengeId).populate('userId');
    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 });
    }

    // Find specific payout in history
    const payout = challenge.payoutHistory.find((p: any) => p.payoutId === payoutId);
    if (!payout) {
      return NextResponse.json({ success: false, message: 'Payout not found' }, { status: 404 });
    }

    if (payout.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Payout already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Update payout status
      payout.status = 'approved';
      payout.processedAt = new Date();

      // Credit user wallet
      const user = await User.findOne({ userId: challenge.userId.userId });
      if (!user) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const wallet = await Wallet.findOne({ userId: challenge.userId.userId });
      if (!wallet) {
        return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 });
      }

      // Add payout amount to wallet balance
      wallet.balance += payout.amount;
      wallet.updatedAt = new Date();
      await wallet.save();

      // Update challenge totals
      challenge.payoutsCount += 1;
      challenge.totalPayouts += payout.amount;

      // Mark payout as paid
      payout.status = 'paid';

      try {
        await Transaction.create({
          userId: challenge.userId.userId,
          type: 'challenge_payout',
          amount: payout.amount,
          status: 'approved',
          method: 'wallet',
          adminNotes: `Challenge payout credited: ${challenge.accountNumber} (Payout ID: ${payout.payoutId})`,
          processedAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to create challenge payout transaction record:', e);
      }

      await challenge.save();

      return NextResponse.json({
        success: true,
        message: 'Payout approved and credited to wallet',
        payout: {
          payoutId: payout.payoutId,
          amount: payout.amount,
          status: payout.status,
          processedAt: payout.processedAt,
        },
      });

    } else if (action === 'reject') {
      // Update payout status
      payout.status = 'rejected';
      payout.processedAt = new Date();

      await challenge.save();

      return NextResponse.json({
        success: true,
        message: 'Payout rejected',
        payout: {
          payoutId: payout.payoutId,
          amount: payout.amount,
          status: payout.status,
          processedAt: payout.processedAt,
        },
      });
    }

  } catch (error: any) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}

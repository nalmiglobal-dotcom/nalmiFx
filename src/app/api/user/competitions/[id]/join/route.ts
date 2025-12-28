import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import Account from '@/infrastructure/database/models/Account';
import Wallet from '@/infrastructure/database/models/Wallet';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: 'Invalid competition ID' }, { status: 400 });
    }

    // Get competition
    const competition = await Competition.findById(params.id);
    if (!competition) {
      return NextResponse.json({ success: false, message: 'Competition not found' }, { status: 404 });
    }

    // Check if competition is open for joining
    const now = new Date();
    if (competition.status === 'ended') {
      return NextResponse.json(
        { success: false, message: 'This competition has ended' },
        { status: 400 }
      );
    }

    // Check max participants
    if (competition.maxParticipants && competition.participants.length >= competition.maxParticipants) {
      return NextResponse.json(
        { success: false, message: 'Competition is full' },
        { status: 400 }
      );
    }

    // Get the account to join with
    let account;
    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return NextResponse.json({ success: false, message: 'Invalid account ID' }, { status: 400 });
      }
      account = await Account.findOne({
        _id: accountId,
        userId: session.userId,
        accountType: 'challenge',
        status: 'active',
      });
    } else {
      // Get user's first active challenge account
      account = await Account.findOne({
        userId: session.userId,
        accountType: 'challenge',
        status: 'active',
      });
    }

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'No active challenge account found. Please create a challenge account first.' },
        { status: 404 }
      );
    }

    // Check if already joined
    if (competition.participants.some((id: any) => id.toString() === account._id.toString())) {
      return NextResponse.json(
        { success: false, message: 'You have already joined this competition with this account' },
        { status: 400 }
      );
    }

    // Check rules if any
    if (competition.rules) {
      if (competition.rules.allowedAccountSizes && competition.rules.allowedAccountSizes.length > 0) {
        if (!account.accountSizeName || !competition.rules.allowedAccountSizes.includes(account.accountSizeName)) {
          return NextResponse.json(
            { success: false, message: `This competition is only for account sizes: ${competition.rules.allowedAccountSizes.join(', ')}` },
            { status: 400 }
          );
        }
      }

      if (competition.rules.allowedChallengeTypes && competition.rules.allowedChallengeTypes.length > 0) {
        if (!account.challengeTypeId || 
            !competition.rules.allowedChallengeTypes.some((id: any) => id.toString() === account.challengeTypeId.toString())) {
          return NextResponse.json(
            { success: false, message: 'This competition is not available for your challenge account type' },
            { status: 400 }
          );
        }
      }
    }

    // Handle entry fee
    if (competition.entryFee > 0) {
      const wallet = await Wallet.findOne({ userId: session.userId });
      if (!wallet || wallet.balance < competition.entryFee) {
        return NextResponse.json(
          { success: false, message: `Insufficient balance. Entry fee is $${competition.entryFee}` },
          { status: 400 }
        );
      }

      // Deduct entry fee
      wallet.balance -= competition.entryFee;
      wallet.equity -= competition.entryFee;
      await wallet.save();

      // Add to prize pool
      competition.prizePool.total += competition.entryFee;
    }

    // Add account to participants
    competition.participants.push(account._id);
    await competition.save();

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the competition!',
      competition,
    });
  } catch (error: any) {
    console.error('Error joining competition:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to join competition' },
      { status: 500 }
    );
  }
}


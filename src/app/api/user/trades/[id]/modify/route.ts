import { NextResponse } from 'next/server';
import { getSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import mongoose from 'mongoose';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connect();
    const { id } = await params;
    const body = await request.json();
    const { stopLoss, takeProfit } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    const trade = await Trade.findById(id);

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    if (trade.userId !== session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (trade.status === 'closed') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify closed trade' },
        { status: 400 }
      );
    }

    if (stopLoss !== undefined) {
      if (trade.side === 'BUY' && stopLoss >= trade.entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be below entry price for BUY orders' },
          { status: 400 }
        );
      }
      if (trade.side === 'SELL' && stopLoss <= trade.entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Stop Loss must be above entry price for SELL orders' },
          { status: 400 }
        );
      }
    }

    if (takeProfit !== undefined) {
      if (trade.side === 'BUY' && takeProfit <= trade.entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be above entry price for BUY orders' },
          { status: 400 }
        );
      }
      if (trade.side === 'SELL' && takeProfit >= trade.entryPrice) {
        return NextResponse.json(
          { success: false, message: 'Take Profit must be below entry price for SELL orders' },
          { status: 400 }
        );
      }
    }

    if (stopLoss !== undefined) {
      trade.stopLoss = stopLoss || undefined;
    }
    if (takeProfit !== undefined) {
      trade.takeProfit = takeProfit || undefined;
    }

    await trade.save();

    return NextResponse.json({
      success: true,
      message: 'Trade modified successfully',
      trade,
    });
  } catch (error: any) {
    console.error('Error modifying trade:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to modify trade' },
      { status: 500 }
    );
  }
}

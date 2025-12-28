import { NextResponse } from 'next/server';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import Wallet from '@/infrastructure/database/models/Wallet';
import { calculateRealizedPnL, getContractSize } from '@/domains/trading/services/calculations';
import mongoose from 'mongoose';

// GET - Get single trade details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await connect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid trade ID' }, { status: 400 });
    }

    const trade = await Trade.findById(id).lean();
    if (!trade) {
      return NextResponse.json({ success: false, message: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trade });
  } catch (error: any) {
    console.error('Error fetching trade:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch trade' }, { status: 500 });
  }
}

// PUT - Admin update trade (price, time, quantity, SL, TP, status)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await connect();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid trade ID' }, { status: 400 });
    }

    const trade = await Trade.findById(id);
    if (!trade) {
      return NextResponse.json({ success: false, message: 'Trade not found' }, { status: 404 });
    }

    const {
      entryPrice,
      closePrice,
      lot,
      stopLoss,
      takeProfit,
      status,
      openedAt,
      closedAt,
      realizedPnL: manualPnL,
    } = body;

    // Track what was changed
    const changes: string[] = [];

    // Update entry price
    if (entryPrice !== undefined && entryPrice !== trade.entryPrice) {
      trade.entryPrice = entryPrice;
      changes.push(`Entry price: ${entryPrice}`);
    }

    // Update lot size
    if (lot !== undefined && lot !== trade.lot && lot >= 0.01) {
      const oldLot = trade.lot;
      trade.lot = lot;
      // Recalculate margin
      trade.margin = (lot * trade.contractSize * trade.entryPrice) / trade.leverage;
      changes.push(`Lot: ${oldLot} → ${lot}`);
    }

    // Update SL/TP
    if (stopLoss !== undefined) {
      trade.stopLoss = stopLoss || undefined;
      changes.push(`Stop Loss: ${stopLoss || 'removed'}`);
    }
    if (takeProfit !== undefined) {
      trade.takeProfit = takeProfit || undefined;
      changes.push(`Take Profit: ${takeProfit || 'removed'}`);
    }

    // Update opened time
    if (openedAt) {
      trade.openedAt = new Date(openedAt);
      changes.push(`Opened at: ${openedAt}`);
    }

    // Handle status change
    if (status && status !== trade.status) {
      const oldStatus = trade.status;
      trade.status = status;
      changes.push(`Status: ${oldStatus} → ${status}`);

      // If closing trade
      if (status === 'closed' && oldStatus === 'open') {
        if (closePrice) {
          trade.closePrice = closePrice;
          trade.closedAt = closedAt ? new Date(closedAt) : new Date();
          trade.closedLot = trade.lot;

          // Calculate PnL automatically if not manually provided
          if (manualPnL !== undefined) {
            trade.realizedPnL = manualPnL;
          } else {
            const contractSize = getContractSize(trade.symbol);
            const pnl = calculateRealizedPnL(
              trade.side,
              trade.entryPrice,
              closePrice,
              trade.lot,
              contractSize
            );
            trade.realizedPnL = parseFloat(pnl.toFixed(2));
          }

          // Update user wallet
          const wallet = await Wallet.findOne({ userId: trade.userId });
          if (wallet) {
            wallet.balance += trade.realizedPnL;
            wallet.equity += trade.realizedPnL;
            await wallet.save();
          }

          changes.push(`Close price: ${closePrice}`);
          changes.push(`Realized PnL: $${trade.realizedPnL}`);
        }
      }

      // If reopening a closed trade
      if (status === 'open' && oldStatus === 'closed') {
        // Reverse the wallet update if trade was closed
        if (trade.realizedPnL !== 0) {
          const wallet = await Wallet.findOne({ userId: trade.userId });
          if (wallet) {
            wallet.balance -= trade.realizedPnL;
            wallet.equity -= trade.realizedPnL;
            await wallet.save();
          }
        }
        trade.closePrice = undefined;
        trade.closedAt = undefined;
        trade.closedLot = 0;
        trade.realizedPnL = 0;
      }
    }

    // Direct close price update (for already closed trades)
    if (closePrice !== undefined && trade.status === 'closed' && closePrice !== trade.closePrice) {
      const oldClosePrice = trade.closePrice;
      const oldPnL = trade.realizedPnL;
      
      trade.closePrice = closePrice;
      
      // Recalculate PnL with new close price
      if (manualPnL !== undefined) {
        trade.realizedPnL = manualPnL;
      } else {
        const contractSize = getContractSize(trade.symbol);
        const newPnL = calculateRealizedPnL(
          trade.side,
          trade.entryPrice,
          closePrice,
          trade.lot,
          contractSize
        );
        trade.realizedPnL = parseFloat(newPnL.toFixed(2));
      }

      // Update wallet with difference
      const pnlDiff = trade.realizedPnL - oldPnL;
      if (pnlDiff !== 0) {
        const wallet = await Wallet.findOne({ userId: trade.userId });
        if (wallet) {
          wallet.balance += pnlDiff;
          wallet.equity += pnlDiff;
          await wallet.save();
        }
      }

      changes.push(`Close price: ${oldClosePrice} → ${closePrice}`);
      changes.push(`PnL recalculated: $${oldPnL} → $${trade.realizedPnL}`);
    }

    // Closed time update
    if (closedAt && trade.status === 'closed') {
      trade.closedAt = new Date(closedAt);
      changes.push(`Closed at: ${closedAt}`);
    }

    // Manual PnL override for closed trades
    if (manualPnL !== undefined && trade.status === 'closed' && !closePrice) {
      const oldPnL = trade.realizedPnL;
      const pnlDiff = manualPnL - oldPnL;
      
      trade.realizedPnL = manualPnL;
      
      // Update wallet
      if (pnlDiff !== 0) {
        const wallet = await Wallet.findOne({ userId: trade.userId });
        if (wallet) {
          wallet.balance += pnlDiff;
          wallet.equity += pnlDiff;
          await wallet.save();
        }
      }
      changes.push(`Manual PnL: $${oldPnL} → $${manualPnL}`);
    }

    await trade.save();

    return NextResponse.json({
      success: true,
      message: changes.length > 0 ? `Trade updated: ${changes.join(', ')}` : 'No changes made',
      trade,
      changes,
    });
  } catch (error: any) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ success: false, message: 'Failed to update trade' }, { status: 500 });
  }
}

// DELETE - Admin delete trade
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    await connect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid trade ID' }, { status: 400 });
    }

    const trade = await Trade.findById(id);
    if (!trade) {
      return NextResponse.json({ success: false, message: 'Trade not found' }, { status: 404 });
    }

    // If trade was closed and had PnL, reverse the wallet update
    if (trade.status === 'closed' && trade.realizedPnL !== 0) {
      const wallet = await Wallet.findOne({ userId: trade.userId });
      if (wallet) {
        wallet.balance -= trade.realizedPnL;
        wallet.equity -= trade.realizedPnL;
        await wallet.save();
      }
    }

    await Trade.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Trade deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete trade' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import Trade from '@/infrastructure/database/models/Trade';
import User from '@/infrastructure/database/models/User';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';
import { getAdminSession } from '@/domains/auth/services/auth.service';

// GET - Fetch trade charges history
export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const symbol = searchParams.get('symbol');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query for trades with charges
    const query: any = {
      $or: [
        { spreadCost: { $gt: 0 } },
        { chargeAmount: { $gt: 0 } },
        { totalCharges: { $gt: 0 } }
      ]
    };

    if (userId) query.userId = parseInt(userId);
    if (symbol) query.symbol = symbol;
    if (startDate || endDate) {
      query.openedAt = {};
      if (startDate) query.openedAt.$gte = new Date(startDate);
      if (endDate) query.openedAt.$lte = new Date(endDate);
    }

    const totalCount = await Trade.countDocuments(query);
    const trades = await Trade.find(query)
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get user info for each trade
    const userIds = [...new Set(trades.map((t: any) => t.userId))];
    const users = await User.find({ userId: { $in: userIds } }).select('userId name email').lean();
    const userMap = new Map(users.map((u: any) => [u.userId, u]));

    // Enrich trades with user info
    const tradesWithUsers = trades.map((trade: any) => {
      const user = userMap.get(trade.userId);
      return {
        _id: trade._id,
        tradeId: trade._id,
        userId: trade.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        symbol: trade.symbol,
        side: trade.side,
        lot: trade.lot,
        entryPrice: trade.entryPrice,
        status: trade.status,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        // Charge details
        spreadPips: trade.spreadPips || 0,
        spreadCost: trade.spreadCost || 0,
        chargeType: trade.chargeType || 'per_lot',
        chargeAmount: trade.chargeAmount || 0,
        totalCharges: trade.totalCharges || 0,
      };
    });

    // Calculate summary stats
    const allChargedTrades = await Trade.find({
      $or: [
        { spreadCost: { $gt: 0 } },
        { chargeAmount: { $gt: 0 } },
        { totalCharges: { $gt: 0 } }
      ]
    }).select('spreadCost chargeAmount totalCharges').lean();

    const totalSpreadIncome = allChargedTrades.reduce((sum: number, t: any) => sum + (t.spreadCost || 0), 0);
    const totalCommissionIncome = allChargedTrades.reduce((sum: number, t: any) => sum + (t.chargeAmount || 0), 0);
    const totalChargesCollected = allChargedTrades.reduce((sum: number, t: any) => sum + (t.totalCharges || 0), 0);

    // Get current trading settings
    const settings = await TradingSettings.findOne({ isActive: true }).lean();

    return NextResponse.json({
      success: true,
      charges: tradesWithUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalTrades: allChargedTrades.length,
        totalSpreadIncome: parseFloat(totalSpreadIncome.toFixed(2)),
        totalCommissionIncome: parseFloat(totalCommissionIncome.toFixed(2)),
        totalChargesCollected: parseFloat(totalChargesCollected.toFixed(2)),
        // Current settings
        currentSettings: settings ? {
          globalSpreadPips: settings.globalSpreadPips,
          globalChargeType: settings.globalChargeType,
          globalChargeAmount: settings.globalChargeAmount,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('[Trade Charges] GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

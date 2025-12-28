import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import BrokerIncome from '@/infrastructure/database/models/BrokerIncome';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';
import { getSession } from '@/domains/auth/services/auth.service';

// GET - Get broker income summary and history
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, all
    const limit = parseInt(searchParams.get('limit') || '50');

    await connect();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get summary
    const summary = await BrokerIncome.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSpreadIncome: { $sum: '$spreadAmount' },
          totalChargeIncome: { $sum: '$chargeAmount' },
          totalIncome: { $sum: '$totalIncome' },
          totalTrades: { $sum: 1 },
          totalLots: { $sum: '$lotSize' },
        },
      },
    ]);

    // Get income by symbol
    const bySymbol = await BrokerIncome.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$symbol',
          spreadIncome: { $sum: '$spreadAmount' },
          chargeIncome: { $sum: '$chargeAmount' },
          totalIncome: { $sum: '$totalIncome' },
          trades: { $sum: 1 },
          lots: { $sum: '$lotSize' },
        },
      },
      { $sort: { totalIncome: -1 } },
      { $limit: 10 },
    ]);

    // Get recent transactions
    const recentTransactions = await BrokerIncome.find({ createdAt: { $gte: startDate } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'email fullName')
      .lean();

    // Get trading settings for reference
    const settings = await TradingSettings.findOne({ isActive: true });

    return NextResponse.json({
      success: true,
      data: {
        summary: summary[0] || {
          totalSpreadIncome: 0,
          totalChargeIncome: 0,
          totalIncome: 0,
          totalTrades: 0,
          totalLots: 0,
        },
        bySymbol,
        recentTransactions,
        settings: {
          globalSpreadPips: settings?.globalSpreadPips || 0,
          globalChargeType: settings?.globalChargeType || 'per_lot',
          globalChargeAmount: settings?.globalChargeAmount || 0,
        },
        period,
      },
    });
  } catch (error: any) {
    console.error('[Broker Income] GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

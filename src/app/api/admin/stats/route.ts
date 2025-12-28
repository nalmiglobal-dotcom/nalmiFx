import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import Wallet from '@/infrastructure/database/models/Wallet';
import Transaction from '@/infrastructure/database/models/Transaction';

export async function GET(req: Request) {
  try {
    // Use getAdminSessionFromRequest first to get admin session from admin_session cookie
    let session = await getAdminSessionFromRequest(req);
    
    // Fallback: try getSession if admin session not found
    if (!session) {
      session = await getSession();
    }

    // Check for admin scope (JWT payload contains scope, not type/role)
    const isAdmin = session && (session.scope === 'admin' || session.scope === 'tradeMaster');
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAdmins,
      totalBalance,
      totalTransactions,
      pendingTransactions,
      depositStats,
      withdrawalStats,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'user', isActive: false }),
      User.countDocuments({ role: 'admin' }),
      Wallet.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'deposit', status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'withdrawal', status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('userId name email balance isActive createdAt')
        .lean(),
    ]);

    const totalBalanceAmount = totalBalance[0]?.total || 0;
    const totalDeposits = depositStats[0]?.total || 0;
    const totalWithdrawals = withdrawalStats[0]?.total || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalAdmins,
        totalBalance: totalBalanceAmount,
        totalTransactions,
        pendingTransactions,
        totalDeposits,
        totalWithdrawals,
        recentUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}


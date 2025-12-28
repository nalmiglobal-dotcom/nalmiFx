import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import AdminUser from '@/infrastructure/database/models/AdminUser';
import AdminWallet from '@/infrastructure/database/models/AdminWallet';
import { getAdminSession } from '@/domains/auth/services/auth.service';

// POST - Transfer funds to admin (super_admin only)
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connect();
    
    // Check if admin is super_admin from database
    const admin = await AdminUser.findOne({ adminId: session.userId });
    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Only super admin can transfer funds' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { toAdminId, amount, description = 'Fund transfer from super admin' } = body;

    if (!toAdminId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Admin ID and valid amount are required' },
        { status: 400 }
      );
    }

    // Check if target admin exists
    const targetAdmin = await AdminUser.findOne({ adminId: toAdminId });
    if (!targetAdmin) {
      return NextResponse.json(
        { success: false, message: 'Target admin not found' },
        { status: 404 }
      );
    }

    // Get or create target admin wallet
    let targetWallet = await AdminWallet.findOne({ adminId: toAdminId });
    if (!targetWallet) {
      targetWallet = new AdminWallet({
        adminId: toAdminId,
        balance: 0,
        currency: 'USD',
      });
    }

    // Get super admin wallet
    let superAdminWallet = await AdminWallet.findOne({ adminId: session.userId });
    if (!superAdminWallet) {
      superAdminWallet = new AdminWallet({
        adminId: session.userId,
        balance: 0,
        currency: 'USD',
      });
    }

    // Add funds to target wallet
    targetWallet.balance += amount;
    targetWallet.totalFundsReceived += amount;
    targetWallet.transactions.push({
      type: 'fund_transfer',
      amount,
      fromAdminId: session.adminId,
      toAdminId,
      description,
      status: 'completed',
      createdAt: new Date(),
    });
    await targetWallet.save();

    // Record in super admin wallet
    superAdminWallet.totalFundsSent += amount;
    superAdminWallet.transactions.push({
      type: 'fund_transfer',
      amount: -amount,
      fromAdminId: session.adminId,
      toAdminId,
      description: `Transfer to ${targetAdmin.name}`,
      status: 'completed',
      createdAt: new Date(),
    });
    await superAdminWallet.save();

    return NextResponse.json({
      success: true,
      message: `Successfully transferred $${amount} to ${targetAdmin.name}`,
      targetBalance: targetWallet.balance,
    });
  } catch (error: any) {
    console.error('Error transferring funds:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to transfer funds' },
      { status: 500 }
    );
  }
}

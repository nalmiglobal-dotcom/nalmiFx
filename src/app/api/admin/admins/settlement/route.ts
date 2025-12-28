import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import AdminUser from '@/infrastructure/database/models/AdminUser';
import AdminWallet from '@/infrastructure/database/models/AdminWallet';
import { getAdminSession } from '@/domains/auth/services/auth.service';

// GET - Get pending settlements
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connect();
    
    // Get admin from database to check role
    const adminUser = await AdminUser.findOne({ adminId: session.userId });
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    let admins;
    if (adminUser.role === 'super_admin') {
      // Super admin sees all pending settlements
      admins = await AdminUser.find({ settlementPending: { $gt: 0 } })
        .select('-password')
        .sort({ settlementPending: -1 })
        .lean();
    } else {
      // Regular admin sees only their own
      admins = await AdminUser.find({ adminId: session.userId, settlementPending: { $gt: 0 } })
        .select('-password')
        .lean();
    }

    return NextResponse.json({
      success: true,
      settlements: admins.map(a => ({
        adminId: a.adminId,
        name: a.name,
        email: a.email,
        settlementPending: a.settlementPending,
        totalEarnings: a.totalEarnings,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settlements' },
      { status: 500 }
    );
  }
}

// POST - Process settlement (super_admin only)
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
        { success: false, message: 'Only super admin can process settlements' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { adminId, amount, action } = body; // action: 'approve' | 'reject'

    if (!adminId || !amount || !action) {
      return NextResponse.json(
        { success: false, message: 'Admin ID, amount, and action are required' },
        { status: 400 }
      );
    }

    const targetAdmin = await AdminUser.findOne({ adminId });
    if (!targetAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    if (amount > targetAdmin.settlementPending) {
      return NextResponse.json(
        { success: false, message: 'Amount exceeds pending settlement' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Get admin wallet
      let wallet = await AdminWallet.findOne({ adminId });
      if (!wallet) {
        wallet = new AdminWallet({ adminId, balance: 0 });
      }

      // Add to balance and record transaction
      wallet.balance += amount;
      wallet.totalSettlements += amount;
      wallet.transactions.push({
        type: 'settlement',
        amount,
        fromAdminId: session.userId,
        toAdminId: adminId,
        description: `Settlement approved by super admin`,
        status: 'completed',
        createdAt: new Date(),
      });
      await wallet.save();

      // Reduce pending settlement
      targetAdmin.settlementPending -= amount;
      await targetAdmin.save();

      return NextResponse.json({
        success: true,
        message: `Settlement of $${amount} approved for ${targetAdmin.name}`,
        newBalance: wallet.balance,
        remainingPending: targetAdmin.settlementPending,
      });
    } else {
      // Reject - just reduce pending
      targetAdmin.settlementPending -= amount;
      await targetAdmin.save();

      return NextResponse.json({
        success: true,
        message: `Settlement of $${amount} rejected for ${targetAdmin.name}`,
        remainingPending: targetAdmin.settlementPending,
      });
    }
  } catch (error: any) {
    console.error('Error processing settlement:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process settlement' },
      { status: 500 }
    );
  }
}

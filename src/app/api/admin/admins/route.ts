import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import AdminUser from '@/infrastructure/database/models/AdminUser';
import AdminWallet from '@/infrastructure/database/models/AdminWallet';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import bcrypt from 'bcryptjs';

// GET - Fetch all admins (super_admin only)
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if admin is super_admin from database
    await connect();
    const admin = await AdminUser.findOne({ adminId: session.userId });
    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Only super admin can manage admins' },
        { status: 403 }
      );
    }

    await connect();
    
    const admins = await AdminUser.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Get wallets for all admins
    const adminIds = admins.map(a => a.adminId);
    const wallets = await AdminWallet.find({ adminId: { $in: adminIds } }).lean();
    const walletMap = new Map(wallets.map(w => [w.adminId, w]));

    const adminsWithWallets = admins.map(admin => ({
      ...admin,
      wallet: walletMap.get(admin.adminId) || null,
    }));

    return NextResponse.json({
      success: true,
      admins: adminsWithWallets,
    });
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

// POST - Create new admin (super_admin only)
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
        { success: false, message: 'Only super admin can create admins' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      email, 
      password, 
      name, 
      role = 'admin', 
      permissions = ['read'], 
      phone,
      commissionRate = 10,
      parentAdminId
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingAdmin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = new AdminUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      permissions,
      phone,
      commissionRate,
      parentAdminId,
      createdBy: session.userId,
      isActive: true,
    });

    await newAdmin.save();

    // Create wallet for new admin
    const wallet = new AdminWallet({
      adminId: newAdmin.adminId,
      balance: 0,
      currency: 'USD',
    });
    await wallet.save();

    // If parentAdminId exists, update parent's referredAdmins
    if (parentAdminId) {
      await AdminUser.updateOne(
        { adminId: parentAdminId },
        { $addToSet: { referredAdmins: newAdmin.adminId } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        adminId: newAdmin.adminId,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
        referralCode: newAdmin.referralCode,
      },
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create admin' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import AdminUser from '@/infrastructure/database/models/AdminUser';
import AdminWallet from '@/infrastructure/database/models/AdminWallet';
import { getAdminSession } from '@/domains/auth/services/auth.service';
import bcrypt from 'bcryptjs';

// GET - Fetch single admin
export async function GET(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  try {
    const session = await getAdminSession();
    
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connect();
    
    const { adminId } = params;
    const admin = await AdminUser.findOne({ adminId: parseInt(adminId) })
      .select('-password')
      .lean();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get wallet
    const wallet = await AdminWallet.findOne({ adminId: parseInt(adminId) }).lean();

    return NextResponse.json({
      success: true,
      admin: { ...admin, wallet },
    });
  } catch (error: any) {
    console.error('Error fetching admin:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admin' },
      { status: 500 }
    );
  }
}

// PUT - Update admin
export async function PUT(
  request: Request,
  { params }: { params: { adminId: string } }
) {
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
        { success: false, message: 'Only super admin can update admins' },
        { status: 403 }
      );
    }
    
    const { adminId } = params;
    const body = await request.json();
    const { password, ...updateData } = body;

    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAdmin = await AdminUser.findOneAndUpdate(
      { adminId: parseInt(adminId) },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      admin: updatedAdmin,
    });
  } catch (error: any) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update admin' },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin
export async function DELETE(
  request: Request,
  { params }: { params: { adminId: string } }
) {
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
        { success: false, message: 'Only super admin can delete admins' },
        { status: 403 }
      );
    }
    
    const { adminId } = params;
    const adminIdNum = parseInt(adminId);

    // Prevent deleting self
    if (session.userId === adminIdNum) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Prevent deleting super_admin
    const adminToDelete = await AdminUser.findOne({ adminId: adminIdNum });
    if (adminToDelete?.role === 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete super admin' },
        { status: 400 }
      );
    }

    await AdminUser.findOneAndDelete({ adminId: adminIdNum });
    await AdminWallet.findOneAndDelete({ adminId: adminIdNum });

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete admin' },
      { status: 500 }
    );
  }
}

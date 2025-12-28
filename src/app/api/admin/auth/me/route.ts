import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import AdminUser from '@/infrastructure/database/models/AdminUser';
import { verifyJwt } from '@/domains/auth/services/auth.service';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJwt(token, 'admin');
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await connect();

    const admin = await AdminUser.findOne({ adminId: payload.adminId }).select('-password');
    
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
        phone: admin.phone,
        avatar: admin.avatar,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Admin me error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get admin details' },
      { status: 500 }
    );
  }
}

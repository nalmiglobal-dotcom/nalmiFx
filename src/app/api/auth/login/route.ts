import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import bcrypt from 'bcryptjs';
import { issueJwt, type JwtScope } from '@/domains/auth/services/auth.service';

// User login - for regular trading users only (admins use /api/admin/auth/login)
export async function POST(request: Request) {
  try {
    await connect();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 400 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { success: false, message: user.banReason || 'Your account has been banned. Please contact support.' },
        { status: 403 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 400 }
      );
    }

    user.lastLogin = new Date();
    await user.save();

    // Determine scope based on user role
    const scope: JwtScope = user.isIB ? 'ib' : 'user';
    
    // Issue role-specific JWT (payload: userId and scope only)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = await issueJwt(user.userId, scope);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
    });

    // Set user session cookie
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to login. Please try again.' },
      { status: 500 }
    );
  }
}


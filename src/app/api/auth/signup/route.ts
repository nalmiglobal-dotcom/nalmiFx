import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import PendingUser from '@/infrastructure/database/models/PendingUser';
import bcrypt from 'bcryptjs';
import { sendEmail, generateOTP, getOTPEmailTemplate } from '@/infrastructure/services/email.service';

export async function POST(request: Request) {
  try {
    await connect();

    const { email, password, name, phone, ref } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing pending registration for this email
    await PendingUser.deleteMany({ email: normalizedEmail });

    // Store pending user data (account NOT created yet)
    await PendingUser.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      phone: phone?.trim(),
      ref: ref?.trim(),
      otp,
      otpExpiresAt,
    });

    // Send OTP email
    const emailSent = await sendEmail({
      to: normalizedEmail,
      subject: 'Verify Your Email - NalmiFX',
      html: getOTPEmailTemplate(otp, 'verification'),
    });

    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email. Please verify to complete registration.',
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      );
    }
    
    const errorMessage = error.message || 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        message: process.env.NODE_ENV === 'development' 
          ? `Signup error: ${errorMessage}` 
          : 'Failed to create user. Please try again.',
      },
      { status: 500 }
    );
  }
}


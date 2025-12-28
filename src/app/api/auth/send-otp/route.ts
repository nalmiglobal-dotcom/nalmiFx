import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import PendingUser from '@/infrastructure/database/models/PendingUser';
import OTP from '@/infrastructure/database/models/OTP';
import { sendEmail, generateOTP, getOTPEmailTemplate } from '@/infrastructure/services/email.service';

export async function POST(request: Request) {
  try {
    await connect();

    const { email, purpose } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!purpose || !['verification', 'password-reset'].includes(purpose)) {
      return NextResponse.json(
        { success: false, message: 'Invalid purpose' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // For password reset, check if user exists
    if (purpose === 'password-reset') {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Don't reveal if user exists or not for security
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, you will receive an OTP',
        });
      }

      // Delete any existing OTPs for this email and purpose
      await OTP.deleteMany({ email: normalizedEmail, purpose });

      // Generate new OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await OTP.create({
        email: normalizedEmail,
        otp,
        purpose,
        expiresAt,
      });

      // Send email
      const emailSent = await sendEmail({
        to: normalizedEmail,
        subject: 'Reset Your Password - NalmiFX',
        html: getOTPEmailTemplate(otp, purpose),
      });

      if (!emailSent) {
        return NextResponse.json(
          { success: false, message: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully to your email',
      });
    }

    // For verification (resend OTP for pending signup)
    if (purpose === 'verification') {
      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Account already exists. Please login.' },
          { status: 400 }
        );
      }

      // Check if there's a pending registration
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
      if (!pendingUser) {
        return NextResponse.json(
          { success: false, message: 'No pending registration found. Please sign up again.' },
          { status: 400 }
        );
      }

      // Generate new OTP and update pending user
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      pendingUser.otp = otp;
      pendingUser.otpExpiresAt = otpExpiresAt;
      await pendingUser.save();

      // Send email
      const emailSent = await sendEmail({
        to: normalizedEmail,
        subject: 'Verify Your Email - NalmiFX',
        html: getOTPEmailTemplate(otp, purpose),
      });

      if (!emailSent) {
        return NextResponse.json(
          { success: false, message: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully to your email',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}

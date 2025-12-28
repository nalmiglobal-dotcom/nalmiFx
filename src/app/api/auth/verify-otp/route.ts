import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import Wallet from '@/infrastructure/database/models/Wallet';
import PendingUser from '@/infrastructure/database/models/PendingUser';
import OTP from '@/infrastructure/database/models/OTP';
import { sendTemplateEmail } from '@/infrastructure/services/email.service';

export async function POST(request: Request) {
  try {
    await connect();

    const { email, otp, purpose } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and OTP are required' },
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

    // For signup verification, check PendingUser
    if (purpose === 'verification') {
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

      if (!pendingUser) {
        return NextResponse.json(
          { success: false, message: 'Registration not found or expired. Please sign up again.' },
          { status: 400 }
        );
      }

      // Check if OTP is expired
      if (new Date() > pendingUser.otpExpiresAt) {
        await PendingUser.deleteOne({ _id: pendingUser._id });
        return NextResponse.json(
          { success: false, message: 'OTP has expired. Please sign up again.' },
          { status: 400 }
        );
      }

      // Verify OTP
      if (pendingUser.otp !== otp) {
        return NextResponse.json(
          { success: false, message: 'Invalid OTP. Please try again.' },
          { status: 400 }
        );
      }

      // Check if user already exists (edge case)
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        await PendingUser.deleteOne({ _id: pendingUser._id });
        return NextResponse.json(
          { success: false, message: 'User already exists. Please login.' },
          { status: 400 }
        );
      }

      // Create the actual user account
      const lastUser = await User.findOne().sort({ userId: -1 });
      const nextUserId = lastUser && lastUser.userId ? lastUser.userId + 1 : 100000;

      const user = new User({
        userId: nextUserId,
        email: normalizedEmail,
        password: pendingUser.password, // Already hashed
        name: pendingUser.name,
        phone: pendingUser.phone,
        role: 'user',
        isActive: true,
        isEmailVerified: true,
        balance: 0,
        kycVerified: false,
      });

      // Handle referral
      if (pendingUser.ref) {
        try {
          const referrer = await User.findOne({ ib_code: pendingUser.ref });
          if (referrer) {
            (user as any).referred_by = referrer.userId;
          }
        } catch (e) {
          console.error('Referral lookup failed', e);
        }
      }

      await user.save();

      // Create wallet
      try {
        const wallet = new Wallet({
          userId: user.userId,
          balance: 0,
          equity: 0,
          margin: 0,
          freeMargin: 0,
          marginLevel: 0,
          floatingProfit: 0,
        });
        await wallet.save();
      } catch (walletError) {
        console.error('Wallet creation error:', walletError);
      }

      // Delete pending user
      await PendingUser.deleteOne({ _id: pendingUser._id });

      // Send welcome email
      await sendTemplateEmail('welcome', normalizedEmail, {
        name: user.name,
        email: user.email,
        userId: user.userId.toString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Email verified! Your account has been created successfully.',
        verified: true,
      });
    }

    // For password reset, use OTP model
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      purpose: 'password-reset',
      verified: false,
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'OTP not found or already used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}

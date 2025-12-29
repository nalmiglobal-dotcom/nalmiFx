import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import User from '@/infrastructure/database/models/User';
import { getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { sendEmail, getAccountSuspendedEmailTemplate, getAccountReactivatedEmailTemplate } from '@/infrastructure/services/email.service';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    await connect();
    const session = await getAdminSessionFromRequest(request);

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const user = await User.findOne({ userId: parseInt(userId) }).select('-password');

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { userId: string } }) {
  try {
    await connect();
    const session = await getAdminSessionFromRequest(request);

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const body = await request.json();
    const { password, action, banReason, ...updateData } = body;

    // Handle specific actions
    if (action === 'ban') {
      const reason = banReason || 'Banned by admin';
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { 
          isBanned: true, 
          isActive: false,
          status: 'banned',
          banReason: reason
        },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      // Send account suspended email
      try {
        const emailHtml = getAccountSuspendedEmailTemplate(updatedUser.name || 'User', reason);
        await sendEmail({
          to: updatedUser.email,
          subject: 'Your NalmiFX Account Has Been Suspended',
          html: emailHtml,
        });
        console.log(`[Admin] Suspension email sent to ${updatedUser.email}`);
      } catch (emailError) {
        console.error('[Admin] Failed to send suspension email:', emailError);
        // Don't fail the ban action if email fails
      }

      return NextResponse.json({ success: true, message: 'User banned successfully', user: updatedUser });
    }
    
    if (action === 'unban') {
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { 
          isBanned: false, 
          isActive: true,
          status: 'active',
          banReason: null
        },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      // Send account reactivated email
      try {
        const emailHtml = getAccountReactivatedEmailTemplate(updatedUser.name || 'User');
        await sendEmail({
          to: updatedUser.email,
          subject: 'Your NalmiFX Account Has Been Reactivated',
          html: emailHtml,
        });
        console.log(`[Admin] Reactivation email sent to ${updatedUser.email}`);
      } catch (emailError) {
        console.error('[Admin] Failed to send reactivation email:', emailError);
      }

      return NextResponse.json({ success: true, message: 'User unbanned successfully', user: updatedUser });
    }
    
    if (action === 'readonly') {
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { 
          isReadOnly: true,
          status: 'readonly'
        },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'User set to read-only mode', user: updatedUser });
    }
    
    if (action === 'removeReadonly') {
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { 
          isReadOnly: false,
          status: 'active'
        },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Read-only mode removed', user: updatedUser });
    }
    
    if (action === 'changePassword') {
      if (!password || password.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { password: hashedPassword },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Password changed successfully', user: updatedUser });
    }
    
    if (action === 'activate') {
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { isActive: true, status: 'active' },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'User activated', user: updatedUser });
    }
    
    if (action === 'deactivate') {
      const updatedUser = await User.findOneAndUpdate(
        { userId: parseInt(userId) },
        { isActive: false, status: 'inactive' },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'User deactivated', user: updatedUser });
    }

    // General update
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId: parseInt(userId) },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    await connect();
    const session = await getAdminSessionFromRequest(request);

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const deletedUser = await User.findOneAndDelete({ userId: parseInt(userId) });

    if (!deletedUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}


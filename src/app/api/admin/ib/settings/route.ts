import { NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import IBSettings from '@/infrastructure/database/models/IBSettings';

// Get settings, or create if they don't exist
export async function GET(req: Request) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    await connect();

    let settings = await IBSettings.findOne({ singleton: true });
    if (!settings) {
      settings = await new IBSettings().save();
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Update settings
export async function PUT(req: Request) {
    try {
      let session = await getSession();
      if (!session) {
        session = await getAdminSessionFromRequest(req);
      }
      if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized. Admin access required.' },
          { status: 403 }
        );
      }
  
      await connect();
      
      const body = await req.json();

      const settings = await IBSettings.findOneAndUpdate(
        { singleton: true },
        { $set: body },
        { new: true, upsert: true } // upsert: true creates the document if it doesn't exist
      );
  
      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        settings,
      });
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update settings' },
        { status: 500 }
      );
    }
  }

import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';
import { getSession } from '@/domains/auth/services/auth.service';
import mongoose from 'mongoose';

// GET - Get current trading settings
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connect();

    let settings = await TradingSettings.findOne({ isActive: true });
    
    // Create default settings if none exist
    if (!settings) {
      settings = new TradingSettings({
        globalSpreadPips: 2,
        globalChargeType: 'per_lot',
        globalChargeAmount: 5,
        globalMinCharge: 0.5,
        globalMaxCharge: 0,
        instrumentSpreads: [
          { symbol: 'XAUUSD', spreadPips: 30, enabled: true },
          { symbol: 'EURUSD', spreadPips: 1.5, enabled: true },
          { symbol: 'GBPUSD', spreadPips: 2, enabled: true },
          { symbol: 'USDJPY', spreadPips: 1.5, enabled: true },
          { symbol: 'BTCUSD', spreadPips: 500, enabled: true },
          { symbol: 'ETHUSD', spreadPips: 50, enabled: true },
        ],
        isActive: true,
        updatedBy: new mongoose.Types.ObjectId(session.userId as string),
      });
      await settings.save();
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[Trading Settings] GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Update trading settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      globalSpreadPips,
      globalChargeType,
      globalChargeAmount,
      globalMinCharge,
      globalMaxCharge,
      instrumentSpreads,
      segmentCharges,
    } = body;

    await connect();

    let settings = await TradingSettings.findOne({ isActive: true });

    if (!settings) {
      settings = new TradingSettings({ isActive: true });
    }

    // Update global settings
    if (globalSpreadPips !== undefined) settings.globalSpreadPips = globalSpreadPips;
    if (globalChargeType !== undefined) settings.globalChargeType = globalChargeType;
    if (globalChargeAmount !== undefined) settings.globalChargeAmount = globalChargeAmount;
    if (globalMinCharge !== undefined) settings.globalMinCharge = globalMinCharge;
    if (globalMaxCharge !== undefined) settings.globalMaxCharge = globalMaxCharge;
    
    // Update instrument spreads
    if (instrumentSpreads && Array.isArray(instrumentSpreads)) {
      settings.instrumentSpreads = instrumentSpreads;
    }

    // Update segment charges
    if (segmentCharges && Array.isArray(segmentCharges)) {
      settings.segmentCharges = segmentCharges;
    }

    settings.updatedBy = new mongoose.Types.ObjectId(session.userId as string);
    await settings.save();

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[Trading Settings] PUT error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - Add/Update instrument spread
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { symbol, spreadPips, enabled = true } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, message: 'Symbol is required' }, { status: 400 });
    }

    await connect();

    let settings = await TradingSettings.findOne({ isActive: true });
    if (!settings) {
      settings = new TradingSettings({ isActive: true });
    }

    // Find and update or add instrument spread
    const existingIndex = settings.instrumentSpreads.findIndex(s => s.symbol === symbol);
    if (existingIndex >= 0) {
      settings.instrumentSpreads[existingIndex] = { symbol, spreadPips, enabled };
    } else {
      settings.instrumentSpreads.push({ symbol, spreadPips, enabled });
    }

    settings.updatedBy = new mongoose.Types.ObjectId(session.userId as string);
    await settings.save();

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[Trading Settings] POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import TradingSettings from '@/infrastructure/database/models/TradingSettings';

// GET - Get current trading settings (public - for applying spreads)
export async function GET(req: NextRequest) {
  try {
    await connect();

    const settings = await TradingSettings.findOne({ isActive: true }).lean();
    
    if (!settings) {
      // Return defaults if no settings configured
      return NextResponse.json({
        success: true,
        settings: {
          minDeposit: 100,
          leverage: 100,
          tradeCharges: 0,
          globalSpreadPips: 2,
          globalChargeType: 'per_lot',
          globalChargeAmount: 5,
          instrumentSpreads: [],
        },
      });
    }

    // Return settings for frontend
    return NextResponse.json({
      success: true,
      settings: {
        minDeposit: settings.minDeposit || 100,
        leverage: settings.leverage || 100,
        tradeCharges: settings.tradeCharges || 0,
        globalSpreadPips: settings.globalSpreadPips,
        globalChargeType: settings.globalChargeType,
        globalChargeAmount: settings.globalChargeAmount,
        globalMinCharge: settings.globalMinCharge,
        globalMaxCharge: settings.globalMaxCharge,
        instrumentSpreads: settings.instrumentSpreads,
      },
    });
  } catch (error: any) {
    console.error('[Trading Settings Public] GET error:', error);
    return NextResponse.json({ 
      success: true,
      settings: {
        minDeposit: 100,
        leverage: 100,
        tradeCharges: 0,
        globalSpreadPips: 2,
        globalChargeType: 'per_lot',
        globalChargeAmount: 5,
        instrumentSpreads: [],
      },
    });
  }
}

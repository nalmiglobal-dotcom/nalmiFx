import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';

// Default prop firm data
const DEFAULT_SETTINGS = {
  challengeTypes: [
    {
      id: 'two_step',
      name: 'Two Step Challenge',
      description: 'Classic evaluation: Phase 1 (8% target) → Phase 2 (5% target) → Funded',
      phases: [
        { phase: 1, name: 'Student Phase', profitTarget: 8, minTradingDays: 3, tradingPeriodDays: 0 },
        { phase: 2, name: 'Practitioner Phase', profitTarget: 5, minTradingDays: 3, tradingPeriodDays: 0 },
      ],
      price: 0,
      enabled: true,
    },
    {
      id: 'one_step',
      name: 'One Step Challenge',
      description: 'Fast track: Single phase (10% target) → Funded',
      phases: [
        { phase: 1, name: 'Evaluation Phase', profitTarget: 10, minTradingDays: 3, tradingPeriodDays: 0 },
      ],
      price: 50,
      enabled: true,
    },
    {
      id: 'instant',
      name: 'Instant Funding',
      description: 'Skip evaluation and get funded immediately with stricter rules',
      phases: [],
      price: 200,
      enabled: true,
    },
  ],
  accountSizePrices: [
    { size: 5000, price: 49 },
    { size: 10000, price: 99 },
    { size: 25000, price: 199 },
    { size: 50000, price: 299 },
    { size: 100000, price: 529 },
    { size: 200000, price: 999 },
  ],
  maxDailyLoss: 5,
  maxTotalLoss: 10,
  maxSingleTradeLoss: 3,
  payoutOptions: [
    {
      id: 'on_demand',
      name: 'On-Demand',
      profitSplit: 90,
      frequency: 'on_demand',
      minPayout: 2,
      consistencyRequired: true,
      consistencyScore: 35,
    },
    {
      id: 'weekly',
      name: 'Weekly Payday',
      profitSplit: 60,
      frequency: 'weekly',
      minPayout: 1,
      consistencyRequired: false,
      consistencyScore: 0,
    },
    {
      id: 'bi_weekly',
      name: 'Bi-Weekly',
      profitSplit: 80,
      frequency: 'bi_weekly',
      minPayout: 1,
      consistencyRequired: false,
      consistencyScore: 0,
    },
    {
      id: 'monthly',
      name: 'Monthly',
      profitSplit: 100,
      frequency: 'monthly',
      minPayout: 1,
      consistencyRequired: false,
      consistencyScore: 0,
    },
  ],
  defaultPayoutOption: 'bi_weekly',
  scalingEnabled: true,
  scalingPlan: [
    { payoutsRequired: 4, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
    { payoutsRequired: 8, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
    { payoutsRequired: 12, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
  ],
  inactivityDays: 30,
  newsTrading: true,
  weekendHolding: true,
  refundOnPass: true,
  refundPercentage: 100,
};

export async function GET(req: NextRequest) {
  try {
    await connect();
    let session = await getSession();

    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let settings = await ChallengeSettings.findOne();
    
    // If settings exist but don't have the new fields, merge with defaults
    if (settings) {
      const needsUpdate = !settings.challengeTypes || settings.challengeTypes.length === 0;
      if (needsUpdate) {
        Object.assign(settings, DEFAULT_SETTINGS);
        settings.updatedAt = new Date();
        await settings.save();
      }
    } else {
      // Create new settings with defaults
      settings = await ChallengeSettings.create(DEFAULT_SETTINGS);
    }
    
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching challenge settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connect();
    let session = await getSession();

    if (!session) {
      session = await getAdminSessionFromRequest(req);
    }

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      challengeTypes,
      accountSizePrices,
      maxDailyLoss,
      maxTotalLoss,
      maxSingleTradeLoss,
      payoutOptions,
      defaultPayoutOption,
      scalingEnabled,
      scalingPlan,
      inactivityDays,
      newsTrading,
      weekendHolding,
      refundOnPass,
      refundPercentage,
    } = body;

    let settings = await ChallengeSettings.findOne();
    if (!settings) {
      settings = new ChallengeSettings();
    }

    // Update challenge types
    if (challengeTypes) settings.challengeTypes = challengeTypes;
    if (accountSizePrices) settings.accountSizePrices = accountSizePrices;
    
    // Risk management
    if (maxDailyLoss !== undefined) settings.maxDailyLoss = maxDailyLoss;
    if (maxTotalLoss !== undefined) settings.maxTotalLoss = maxTotalLoss;
    if (maxSingleTradeLoss !== undefined) settings.maxSingleTradeLoss = maxSingleTradeLoss;
    
    // Payout configuration
    if (payoutOptions) settings.payoutOptions = payoutOptions;
    if (defaultPayoutOption) settings.defaultPayoutOption = defaultPayoutOption;
    
    // Scaling
    if (scalingEnabled !== undefined) settings.scalingEnabled = scalingEnabled;
    if (scalingPlan) settings.scalingPlan = scalingPlan;
    
    // General rules
    if (inactivityDays !== undefined) settings.inactivityDays = inactivityDays;
    if (newsTrading !== undefined) settings.newsTrading = newsTrading;
    if (weekendHolding !== undefined) settings.weekendHolding = weekendHolding;
    
    // Refund policy
    if (refundOnPass !== undefined) settings.refundOnPass = refundOnPass;
    if (refundPercentage !== undefined) settings.refundPercentage = refundPercentage;
    
    settings.updatedAt = new Date();

    await settings.save();

    return NextResponse.json({ success: true, settings, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating challenge settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

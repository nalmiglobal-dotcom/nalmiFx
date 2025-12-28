import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import ChallengeSettings from '@/infrastructure/database/models/ChallengeSettings';

// Default prop firm data for auto-population
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
    { id: 'on_demand', name: 'On-Demand', profitSplit: 90, frequency: 'on_demand', minPayout: 2, consistencyRequired: true, consistencyScore: 35 },
    { id: 'weekly', name: 'Weekly Payday', profitSplit: 60, frequency: 'weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
    { id: 'bi_weekly', name: 'Bi-Weekly', profitSplit: 80, frequency: 'bi_weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
    { id: 'monthly', name: 'Monthly', profitSplit: 100, frequency: 'monthly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
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

// Public API to get challenge settings (for buy-challenge page)
export async function GET(req: NextRequest) {
  try {
    await connect();
    
    let settings = await ChallengeSettings.findOne();
    
    // Auto-populate if settings don't exist or are missing new fields
    if (!settings) {
      settings = await ChallengeSettings.create(DEFAULT_SETTINGS);
    } else if (!settings.challengeTypes || settings.challengeTypes.length === 0) {
      Object.assign(settings, DEFAULT_SETTINGS);
      settings.updatedAt = new Date();
      await settings.save();
    }
    
    return NextResponse.json({
      success: true,
      settings: {
        challengeTypes: settings.challengeTypes || [],
        accountSizePrices: settings.accountSizePrices || [],
        payoutOptions: settings.payoutOptions || [],
        defaultPayoutOption: settings.defaultPayoutOption || 'bi_weekly',
        maxDailyLoss: settings.maxDailyLoss ?? 5,
        maxTotalLoss: settings.maxTotalLoss ?? 10,
        maxSingleTradeLoss: settings.maxSingleTradeLoss ?? 3,
        inactivityDays: settings.inactivityDays ?? 30,
        newsTrading: settings.newsTrading ?? true,
        weekendHolding: settings.weekendHolding ?? true,
        refundOnPass: settings.refundOnPass ?? true,
        refundPercentage: settings.refundPercentage ?? 100,
      },
    });
  } catch (error: any) {
    console.error('Error fetching challenge settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

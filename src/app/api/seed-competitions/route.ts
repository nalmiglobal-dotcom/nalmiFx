import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import Competition from '@/infrastructure/database/models/Competition';
import MockTrader from '@/infrastructure/database/models/MockTrader';

const mockTraderNames = [
  'forex D', 'UTTAM J', 'foxx f', 'Kanha S', 'Asha bai S', 'Rahul M', 'Priya K',
  'Alex T', 'Sarah W', 'Mike C', 'John B', 'Emma L', 'David H', 'Lisa R', 'Tom K',
  'Anna P', 'James D', 'Maria G', 'Robert F', 'Jennifer N', 'William A', 'Linda Z',
  'Richard B', 'Susan M', 'Joseph T', 'Margaret W', 'Charles E', 'Betty Q', 'Thomas Y',
  'Dorothy U', 'Christopher I', 'Nancy O', 'Daniel P', 'Karen S', 'Matthew D', 'Helen F',
  'Anthony G', 'Sandra H', 'Mark J', 'Donna K', 'Donald L', 'Carol M', 'Steven N',
  'Ruth O', 'Paul P', 'Sharon Q', 'Andrew R', 'Michelle S', 'Joshua T', 'Laura U'
];

const countries = ['-', 'US', 'UK', 'IN', 'DE', 'FR', 'JP', 'AU', 'CA', 'BR', 'SG'];

export async function GET() {
  try {
    await connect();

    // Create 50 mock traders
    const existingMockTraders = await MockTrader.countDocuments();
    if (existingMockTraders < 50) {
      const mockTradersToCreate = [];
      for (let i = existingMockTraders; i < 50; i++) {
        mockTradersToCreate.push({
          name: mockTraderNames[i] || `Trader ${i + 1}`,
          country: countries[Math.floor(Math.random() * countries.length)],
          baseProfit: Math.round((100000 + Math.random() * 600000) * 100) / 100,
          baseProfitPercentage: Math.round((300 + Math.random() * 400) * 100) / 100,
          baseTrades: Math.floor(50 + Math.random() * 250),
          baseWinRatio: Math.floor(Math.random() * 15),
          volatility: 0.15 + Math.random() * 0.2,
          isActive: true,
        });
      }
      await MockTrader.insertMany(mockTradersToCreate);
    }

    // Delete existing competitions and create fresh ones
    await Competition.deleteMany({});
    
    const now = new Date();
    const competitions = [];

    // Current month competition (ongoing)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    competitions.push({
      name: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()} Monthly Competition`,
      description: 'Monthly trading competition for all traders. Compete for massive prizes!',
      type: 'monthly',
      category: 'most_profit',
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      entryOpenDate: new Date(currentMonthStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      entryCloseDate: new Date(currentMonthStart.getTime() + 5 * 24 * 60 * 60 * 1000),
      entryFee: 0,
      prizePool: { total: 50000 },
      winnerPrizes: { first: 25000, second: 15000, third: 10000 },
      status: 'ongoing',
      organizer: 'NalmiFXs',
      tags: ['NalmiFXs', 'matchtrader', 'monthly'],
      rules: { maxOverallLoss: 10, maxDailyLoss: 5, customRules: ['EA execution is prohibited'] },
      isActive: true,
    });

    // Weekly Top Scalper
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59);
    competitions.push({
      name: 'Weekly Top Scalper Challenge',
      description: 'Show your scalping skills and win prizes! Fast trades, big rewards.',
      type: 'weekly',
      category: 'top_scalping',
      startDate: weekStart,
      endDate: weekEnd,
      entryOpenDate: weekStart,
      entryCloseDate: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      entryFee: 10,
      prizePool: { total: 5000 },
      winnerPrizes: { first: 2500, second: 1500, third: 1000 },
      status: 'ongoing',
      organizer: 'NalmiFXs',
      tags: ['scalping', 'weekly'],
      rules: { minTrades: 20, customRules: ['Scalping trades only', 'Max hold time 5 minutes'] },
      isActive: true,
    });

    // Daily competition
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59);
    competitions.push({
      name: 'Trader of the Day',
      description: 'Daily competition - Best profit percentage wins!',
      type: 'daily',
      category: 'trader_of_day',
      startDate: today,
      endDate: todayEnd,
      entryOpenDate: today,
      entryCloseDate: new Date(today.getTime() + 6 * 60 * 60 * 1000),
      entryFee: 5,
      prizePool: { total: 1000 },
      winnerPrizes: { first: 500, second: 300, third: 200 },
      status: 'ongoing',
      organizer: 'NalmiFXs',
      tags: ['daily', 'trader_of_day'],
      rules: { minTrades: 5 },
      isActive: true,
    });

    // Top Trading Weekly
    competitions.push({
      name: 'Top Trading Weekly',
      description: 'Weekly trading competition - Best overall traders compete!',
      type: 'weekly',
      category: 'top_trading',
      startDate: weekStart,
      endDate: weekEnd,
      entryOpenDate: weekStart,
      entryCloseDate: new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      entryFee: 25,
      prizePool: { total: 10000 },
      winnerPrizes: { first: 5000, second: 3000, third: 2000 },
      status: 'ongoing',
      organizer: 'NalmiFXs',
      tags: ['trading', 'weekly', 'premium'],
      rules: { minTrades: 10, maxDailyLoss: 5, maxOverallLoss: 10 },
      isActive: true,
    });

    // Most Profit Challenge
    competitions.push({
      name: 'Most Profit Challenge',
      description: 'Achieve the highest profit percentage to win!',
      type: 'weekly',
      category: 'most_profit',
      startDate: weekStart,
      endDate: weekEnd,
      entryOpenDate: weekStart,
      entryCloseDate: weekEnd,
      entryFee: 15,
      prizePool: { total: 7500 },
      winnerPrizes: { first: 4000, second: 2500, third: 1000 },
      status: 'ongoing',
      organizer: 'NalmiFXs',
      tags: ['profit', 'percentage', 'weekly'],
      rules: { minTrades: 5 },
      isActive: true,
    });

    // Past months competitions (ended)
    for (let i = 1; i <= 5; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      competitions.push({
        name: `${monthStart.toLocaleString('default', { month: 'long' })} ${monthStart.getFullYear()} Monthly Competition`,
        description: 'Monthly trading competition',
        type: 'monthly',
        category: 'most_profit',
        startDate: monthStart,
        endDate: monthEnd,
        entryOpenDate: monthStart,
        entryCloseDate: monthStart,
        entryFee: 0,
        prizePool: { total: 50000 },
        winnerPrizes: { first: 25000, second: 15000, third: 10000 },
        status: 'ended',
        organizer: 'NalmiFXs',
        tags: ['NalmiFXs', 'matchtrader'],
        isActive: true,
      });
    }

    await Competition.insertMany(competitions);

    // Generate leaderboards for all competitions with mock traders
    const mockTraders = await MockTrader.find({ isActive: true });
    const allCompetitions = await Competition.find({});

    for (const competition of allCompetitions) {
      const leaderboard = mockTraders.map((trader: any) => {
        const fluctuation = () => 1 + (Math.random() - 0.5) * 2 * trader.volatility;
        return {
          odType: 'mock',
          odId: trader._id,
          odName: trader.name,
          odCountry: trader.country,
          trades: Math.round(trader.baseTrades * fluctuation()),
          winRatio: Math.min(100, Math.max(0, Math.round(trader.baseWinRatio * fluctuation()))),
          profit: Math.round(trader.baseProfit * fluctuation() * 100) / 100,
          profitPercentage: Math.round(trader.baseProfitPercentage * fluctuation() * 100) / 100,
          rank: 0,
        };
      }).sort((a: any, b: any) => b.profitPercentage - a.profitPercentage)
        .map((entry: any, index: number) => ({ ...entry, rank: index + 1 }));

      competition.leaderboard = leaderboard;

      if (competition.status === 'ended' && leaderboard.length >= 3) {
        competition.winners = [
          { ...leaderboard[0], position: 1, prize: competition.winnerPrizes?.first || 0 },
          { ...leaderboard[1], position: 2, prize: competition.winnerPrizes?.second || 0 },
          { ...leaderboard[2], position: 3, prize: competition.winnerPrizes?.third || 0 },
        ];
      }

      await competition.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Sample competitions created successfully!',
      mockTradersCount: await MockTrader.countDocuments(),
      competitionsCount: await Competition.countDocuments(),
    });
  } catch (error: any) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to seed data' },
      { status: 500 }
    );
  }
}

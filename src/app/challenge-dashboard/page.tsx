"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Trophy, Clock, Award, Share2, Wallet, DollarSign } from "lucide-react";

interface ChallengeAccount {
  _id: string;
  accountSize: number;
  initialBalance: number;
  currentBalance: number;
  status: 'evaluation' | 'funded' | 'breached' | 'expired';
  challengeType: string;
  currentPhase: number;
  totalPhases: number;
  totalProfitPercent: number;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  realizedPnL: number;
  accountNumber: string;
  payoutOption: string;
  payoutHistory: {
    payoutId: string;
    amount: number;
    profitSplit: number;
    payoutOption: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    requestedAt: Date;
    processedAt?: Date;
    transactionId?: string;
  }[];
  nextPayoutDate?: Date;
}

interface ChallengeTrade {
  _id: string;
  symbol: string;
  side: string;
  realizedPnL: number;
  createdAt: string;
  closedAt: string;
}

export default function ChallengeDashboardPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<ChallengeAccount[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeAccount | null>(null);
  const [challengeTrades, setChallengeTrades] = useState<ChallengeTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostTradedSymbols, setMostTradedSymbols] = useState<{symbol: string; count: number}[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);

  useEffect(() => {
    // Get active challenge from localStorage
    const storedId = localStorage.getItem('activeChallengeAccountId');
    setActiveChallengeId(storedId);
    
    fetchChallenges();
    
    // Listen for challenge account changes
    const handleChallengeChange = (e: CustomEvent) => {
      if (e.detail) {
        setActiveChallengeId(e.detail._id);
        setActiveChallenge(e.detail);
      } else {
        setActiveChallengeId(null);
        setActiveChallenge(null);
      }
    };
    
    window.addEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
    return () => window.removeEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
  }, []);

  useEffect(() => {
    if (activeChallengeId) {
      fetchChallengeTrades(activeChallengeId);
    }
  }, [activeChallengeId]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/challenges/purchase', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setChallenges(data.challenges || []);
        // Set active challenge if we have one selected
        const storedId = localStorage.getItem('activeChallengeAccountId');
        if (storedId && data.challenges) {
          const active = data.challenges.find((c: ChallengeAccount) => c._id === storedId);
          if (active) setActiveChallenge(active);
        }
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeTrades = async (challengeId: string) => {
    try {
      const res = await fetch(`/api/user/trades?status=closed&challengeAccountId=${challengeId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.trades) {
        setChallengeTrades(data.trades);
        const symbolCounts: Record<string, number> = {};
        data.trades.forEach((trade: ChallengeTrade) => {
          symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1;
        });
        const sorted = Object.entries(symbolCounts)
          .map(([symbol, count]) => ({ symbol, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setMostTradedSymbols(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  };

  // Use active challenge data if available, otherwise aggregate from all challenges
  const getTotalAllocation = () => activeChallenge ? activeChallenge.accountSize : challenges.reduce((sum, c) => sum + c.accountSize, 0);
  const getCurrentBalance = () => activeChallenge?.currentBalance || 0;
  const getInitialBalance = () => activeChallenge?.initialBalance || activeChallenge?.accountSize || 0;
  const getTotalProfit = () => activeChallenge ? (activeChallenge.currentBalance - (activeChallenge.initialBalance || activeChallenge.accountSize)) : 0;
  const getTotalProfitPercent = () => activeChallenge?.totalProfitPercent || 0;
  const getRealizedPnL = () => activeChallenge?.realizedPnL || 0;
  
  const getWinCount = () => activeChallenge?.winningTrades || 0;
  const getLoseCount = () => activeChallenge?.losingTrades || 0;
  const getWinRate = () => activeChallenge?.winRate || 0;
  const getLossRate = () => {
    const total = getWinCount() + getLoseCount();
    if (total === 0) return 0;
    return (getLoseCount() / total) * 100;
  };
  
  const getUserLevel = () => {
    const fundedCount = challenges.filter(c => c.status === 'funded').length;
    if (fundedCount >= 5) return 'Gold';
    if (fundedCount >= 2) return 'Silver';
    return 'Bronze';
  };
  
  const getTotalTrades = () => activeChallenge?.tradesCount || challengeTrades.length;
  const getBuyTrades = () => challengeTrades.filter(t => t.side === 'BUY').length;
  const getSellTrades = () => challengeTrades.filter(t => t.side === 'SELL').length;
  const getBehavioralBias = () => {
    const total = challengeTrades.length;
    if (total === 0) return 'Neutral';
    const buyPercent = (getBuyTrades() / total) * 100;
    if (buyPercent > 60) return 'Bullish';
    if (buyPercent < 40) return 'Bearish';
    return 'Neutral';
  };
  
  const getChallengeStatus = () => {
    if (!activeChallenge) return 'No Challenge Selected';
    if (activeChallenge.status === 'funded') return 'Funded';
    if (activeChallenge.status === 'breached') return 'Breached';
    if (activeChallenge.status === 'expired') return 'Expired';
    return `Phase ${activeChallenge.currentPhase}/${activeChallenge.totalPhases}`;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-xl font-semibold">
                  {activeChallenge ? `Challenge #${activeChallenge.accountNumber}` : 'Challenge Dashboard'}
                </h1>
                {activeChallenge ? (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-3 py-1 ${
                      activeChallenge.status === 'funded' ? 'bg-green-500/20 text-green-500 border-green-500' :
                      activeChallenge.status === 'breached' ? 'bg-red-500/20 text-red-500 border-red-500' :
                      'bg-amber-500/20 text-amber-500 border-amber-500'
                    }`}
                  >
                    {getChallengeStatus()} | ${getTotalAllocation().toLocaleString()}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs px-3 py-1 bg-secondary border-border">
                    Select a challenge account from the header
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/buy-challenge')} className="bg-amber-500 hover:bg-amber-600 text-white text-sm">
                  <Trophy className="w-4 h-4 mr-2" />
                  BUY CHALLENGE
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Row 1: Chart | Behavioral Bias | Trading Day Performance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Equity Chart */}
                  <Card className="bg-primary/20 border-0">
                    <CardContent className="p-6 h-40 flex items-center justify-center rounded-xl">
                      <p className="text-muted-foreground text-sm">No data available</p>
                    </CardContent>
                  </Card>

                  {/* Behavioral Bias */}
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-muted-foreground">Behavioral Bias</span>
                        <span className="text-sm">Total Trades: <strong>{getTotalTrades()}</strong></span>
                      </div>
                      <div className="flex items-center justify-center gap-4 mb-3">
                        <span className="text-2xl">��</span>
                        <span className="text-xl font-bold">{getBehavioralBias()}</span>
                        <span className="text-2xl">��</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${getTotalTrades() > 0 ? (getBuyTrades() / getTotalTrades()) * 100 : 50}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{getSellTrades()} ({getTotalTrades() > 0 ? ((getSellTrades() / getTotalTrades()) * 100).toFixed(1) : '50.0'}%)</span>
                        <span>⌃</span>
                        <span>{getBuyTrades()} ({getTotalTrades() > 0 ? ((getBuyTrades() / getTotalTrades()) * 100).toFixed(1) : '50.0'}%)</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trading Day Performance */}
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-muted-foreground">Trading Day Performance</span>
                        <span className="text-sm">Best Day: <strong>Thu</strong></span>
                      </div>
                      <div className="flex justify-between items-end h-20 pt-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                          <div key={day} className="flex flex-col items-center gap-1">
                            <div className="w-5 bg-secondary rounded" style={{ height: '8px' }}></div>
                            <span className="text-[10px] text-muted-foreground">{day}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Your Level | Profitability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Your Level Card */}
                  <Card className="bg-primary/20 border-0 overflow-hidden">
                    <CardContent className="p-6 relative">
                      <div className="flex justify-between">
                        <div className="z-10">
                          <p className="text-foreground/60 text-sm mb-1">Your Level</p>
                          <h2 className="text-4xl font-bold text-foreground mb-6">{getUserLevel()}</h2>
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-foreground/60 text-xs">Current Balance</p>
                              <p className="font-bold text-foreground">${getCurrentBalance().toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-foreground/60 text-xs">Total Profit</p>
                              <p className={`font-bold ${getTotalProfit() >= 0 ? 'text-green-500' : 'text-red-500'}`}>${getTotalProfit().toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-foreground/60 text-xs">Profit %</p>
                              <p className={`font-bold ${getTotalProfitPercent() >= 0 ? 'text-green-500' : 'text-red-500'}`}>{getTotalProfitPercent().toFixed(2)}%</p>
                            </div>
                          </div>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                          <Award className="w-32 h-32 text-amber-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profitability Card */}
                  <Card className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">Profitability</p>
                          <div className="flex items-center gap-10">
                            <div>
                              <p className="text-xs text-muted-foreground">Won</p>
                              <p className="text-3xl font-bold text-green-500">{getWinRate().toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">{getWinCount()}</p>
                            </div>
                            <div className="text-center">
                              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">Trades Taken</p>
                              <p className="text-xs text-muted-foreground">Start trading to see analysis</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Lost</p>
                              <p className="text-3xl font-bold text-red-500">{getLossRate().toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">{getLoseCount()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Avg Holding Period:</p>
                          <p className="font-bold">0s</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 3: Most Traded | Session Win Rates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Most Traded Instruments */}
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">Most Traded 3 Instruments</p>
                      {mostTradedSymbols.length > 0 ? (
                        <div className="space-y-3">
                          {mostTradedSymbols.map((item, index) => (
                            <div key={item.symbol} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                                <span className="font-medium">{item.symbol}</span>
                              </div>
                              <Badge variant="outline">{item.count} trades</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No trades yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Session Win Rates */}
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">Session Win Rates</p>
                      <div className="space-y-3">
                        {['New York', 'London', 'Asia'].map((session) => (
                          <div key={session} className="flex items-center gap-4">
                            <span className="w-20 text-sm">{session}</span>
                            <div className="flex-1 bg-secondary rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                            <span className="w-12 text-right text-sm text-muted-foreground">0.0%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payout Section for Funded Accounts */}
                {activeChallenge && activeChallenge.status === 'funded' && (
                  <div className="mt-6">
                    <Card className="bg-card border-border">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Payout Management</h3>
                          </div>
                          <Badge variant="outline">
                            {activeChallenge.payoutOption || 'Default'} Plan
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Available Profit */}
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Available for Payout</p>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-2xl font-bold text-green-500">
                                ${Math.max(0, activeChallenge.currentBalance - activeChallenge.initialBalance).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Current balance - Initial balance
                            </p>
                          </div>

                          {/* Next Payout Date */}
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Next Payout Available</p>
                            {activeChallenge.nextPayoutDate ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">
                                  {new Date(activeChallenge.nextPayoutDate).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-green-500">Available Now</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payout History */}
                        {activeChallenge.payoutHistory && activeChallenge.payoutHistory.length > 0 && (
                          <div className="mt-6">
                            <p className="text-sm text-muted-foreground mb-3">Payout History</p>
                            <div className="space-y-2">
                              {activeChallenge.payoutHistory.map((payout, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-sm">Payout #{payout.payoutId.slice(-6)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${payout.amount.toFixed(2)}</p>
                                    <Badge variant={
                                      payout.status === 'paid' ? 'default' :
                                      payout.status === 'approved' ? 'secondary' :
                                      payout.status === 'rejected' ? 'destructive' : 'outline'
                                    }>
                                      {payout.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Payout Button */}
                        <div className="mt-6">
                          <Button 
                            className="w-full"
                            onClick={() => requestPayout()}
                            disabled={
                              Math.max(0, activeChallenge.currentBalance - activeChallenge.initialBalance) <= 0 ||
                              (activeChallenge.nextPayoutDate && new Date() < new Date(activeChallenge.nextPayoutDate))
                            }
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Request Payout
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

const requestPayout = async () => {
  // This would call the payout API
  console.log('Requesting payout...');
};

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trophy, Calendar, Users, DollarSign, Clock, ArrowLeft, Check, TrendingUp } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface LeaderboardEntry {
  odType: string;
  odId: string;
  odName: string;
  odCountry?: string;
  trades: number;
  winRatio: number;
  profit: number;
  profitPercentage: number;
  rank: number;
}

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: { total: number };
  winnerPrizes?: { first: number; second: number; third: number };
  status: 'upcoming' | 'ongoing' | 'ended';
  participants: string[];
  leaderboard?: LeaderboardEntry[];
  rules?: {
    minTrades?: number;
    maxDailyLoss?: number;
    maxOverallLoss?: number;
    customRules?: string[];
  };
  organizer?: string;
  tags?: string[];
  hasJoined?: boolean;
  userRank?: number;
  participantCount?: number;
}

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showPrizePool, setShowPrizePool] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (params.id) {
      fetchCompetition();
    }
  }, [params.id]);

  useEffect(() => {
    if (!competition) return;
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(competition.endDate);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [competition]);

  const fetchCompetition = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user/competitions/${params.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCompetition(data.competition);
      } else {
        toast.error(data.message || 'Failed to load competition');
        if (res.status === 401) router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch competition:', error);
      toast.error('Failed to load competition');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!competition) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/user/competitions/${competition._id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Successfully joined the competition!');
        fetchCompetition();
      } else {
        toast.error(data.message || 'Failed to join competition');
      }
    } catch (error) {
      toast.error('Failed to join competition');
    } finally {
      setJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Competition not found</p>
            <Button className="mt-4" onClick={() => router.push('/competitions')}>
              Back to Competitions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const topThree = competition.leaderboard?.slice(0, 3) || [];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Button variant="ghost" size="icon" onClick={() => router.push('/competitions')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold truncate">{competition.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(competition.status)}`}></span>
                  <span className="text-xs sm:text-sm capitalize">{competition.status}</span>
                  {competition.organizer && (
                    <>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{competition.organizer}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Countdown & Actions */}
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Ends In</p>
                        <div className="flex gap-2 sm:gap-4">
                          <div className="text-center flex-1 sm:flex-none">
                            <div className="text-xl sm:text-3xl font-bold bg-muted px-2 sm:px-4 py-2 rounded">{countdown.days.toString().padStart(2, '0')}</div>
                            <p className="text-xs text-muted-foreground mt-1">Day</p>
                          </div>
                          <div className="text-center flex-1 sm:flex-none">
                            <div className="text-xl sm:text-3xl font-bold bg-muted px-2 sm:px-4 py-2 rounded">{countdown.hours.toString().padStart(2, '0')}</div>
                            <p className="text-xs text-muted-foreground mt-1">Hr</p>
                          </div>
                          <div className="text-center flex-1 sm:flex-none">
                            <div className="text-xl sm:text-3xl font-bold bg-muted px-2 sm:px-4 py-2 rounded">{countdown.minutes.toString().padStart(2, '0')}</div>
                            <p className="text-xs text-muted-foreground mt-1">Min</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {competition.hasJoined ? (
                          <Button variant="outline" disabled size="sm" className="flex-1 sm:flex-none">
                            <Check className="w-4 h-4 mr-2" /> Joined
                          </Button>
                        ) : competition.status !== 'ended' ? (
                          <Button onClick={handleJoin} disabled={joining} size="sm" className="flex-1 sm:flex-none">
                            {joining ? 'Joining...' : `Join ${competition.entryFee > 0 ? `($${competition.entryFee})` : '(Free)'}`}
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setShowPrizePool(true)}>Show Prizepool</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top 3 Winners Podium */}
                {topThree.length >= 3 && (
                  <div className="flex justify-center items-end gap-2 sm:gap-4 py-4 sm:py-6">
                    {/* 2nd Place */}
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-400 mx-auto mb-2 flex items-center justify-center text-xl sm:text-2xl">🥈</div>
                      <p className="font-semibold text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px]">{topThree[1]?.odName}</p>
                      <p className="text-xs text-muted-foreground">2</p>
                    </div>
                    {/* 1st Place */}
                    <div className="text-center -mt-4 sm:-mt-8">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-yellow-500 mx-auto mb-2 flex items-center justify-center text-2xl sm:text-3xl">🥇</div>
                      <p className="font-semibold text-sm sm:text-base truncate max-w-[70px] sm:max-w-[100px]">{topThree[0]?.odName}</p>
                      <p className="text-xs text-muted-foreground">1</p>
                    </div>
                    {/* 3rd Place */}
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-700 mx-auto mb-2 flex items-center justify-center text-xl sm:text-2xl">🥉</div>
                      <p className="font-semibold text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px]">{topThree[2]?.odName}</p>
                      <p className="text-xs text-muted-foreground">3</p>
                    </div>
                  </div>
                )}

                {/* Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Trades</TableHead>
                            <TableHead className="text-right">Win Ratio</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Gain</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competition.leaderboard?.slice(0, 50).map((entry, idx) => (
                            <TableRow key={idx} className={idx < 3 ? 'bg-muted/30' : ''}>
                              <TableCell className="font-semibold">
                                {entry.rank === 1 && '🥇 '}
                                {entry.rank === 2 && '🥈 '}
                                {entry.rank === 3 && '🥉 '}
                                {entry.rank}
                              </TableCell>
                              <TableCell className="font-medium">{entry.odName}</TableCell>
                              <TableCell>{entry.odCountry || '-'}</TableCell>
                              <TableCell className="text-right">{entry.trades}</TableCell>
                              <TableCell className="text-right">{entry.winRatio}%</TableCell>
                              <TableCell className="text-right text-green-500 font-semibold">
                                ${entry.profit.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-green-500 flex items-center justify-end gap-1">
                                  {entry.profitPercentage.toFixed(2)}% <TrendingUp className="w-3 h-3" />
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!competition.leaderboard || competition.leaderboard.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No participants yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-4">
                {/* User Rank Card */}
                {competition.hasJoined && competition.userRank && (
                  <Card className="bg-primary text-primary-foreground">
                    <CardContent className="p-4">
                      <p className="text-xs opacity-80">#{competition.userRank} Current Rank</p>
                      <p className="text-sm opacity-80">Your current rank in the competition.</p>
                      <Button variant="secondary" size="sm" className="mt-3 w-full">My Stats</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Competition Info */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Starts</p>
                        <p className="font-semibold text-sm">{new Date(competition.startDate).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends</p>
                        <p className="font-semibold text-sm">{new Date(competition.endDate).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Entry</p>
                        <p className="font-semibold">{competition.entryFee === 0 ? 'Free' : `$${competition.entryFee}`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participants</p>
                        <p className="font-semibold">{((competition.leaderboard?.length || 0) + (competition.participantCount || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                    {competition.organizer && (
                      <div>
                        <p className="text-xs text-muted-foreground">Organizer</p>
                        <p className="font-semibold">{competition.organizer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trading Rules */}
                {competition.rules && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Trading Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {competition.rules.maxOverallLoss && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{competition.rules.maxOverallLoss}% Max Overall Loss</span>
                        </div>
                      )}
                      {competition.rules.maxDailyLoss && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{competition.rules.maxDailyLoss}% Max Daily Loss</span>
                        </div>
                      )}
                      {competition.rules.minTrades && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Min {competition.rules.minTrades} trades</span>
                        </div>
                      )}
                      {competition.rules.customRules?.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileNav />

      {/* Prize Pool Dialog */}
      <Dialog open={showPrizePool} onOpenChange={setShowPrizePool}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prize Pool</DialogTitle>
            <DialogDescription>Prize distribution for this competition</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Total Prize Pool</p>
              <p className="text-4xl font-bold text-primary">${(competition.prizePool?.total || 0).toLocaleString()}</p>
            </div>
            {competition.winnerPrizes && (
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <p className="text-2xl mb-1">🥇</p>
                  <p className="text-xs text-muted-foreground">1st Place</p>
                  <p className="font-bold text-lg">${competition.winnerPrizes.first.toLocaleString()}</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl mb-1">🥈</p>
                  <p className="text-xs text-muted-foreground">2nd Place</p>
                  <p className="font-bold text-lg">${competition.winnerPrizes.second.toLocaleString()}</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl mb-1">🥉</p>
                  <p className="text-xs text-muted-foreground">3rd Place</p>
                  <p className="font-bold text-lg">${competition.winnerPrizes.third.toLocaleString()}</p>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

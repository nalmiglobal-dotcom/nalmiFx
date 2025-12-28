"use client";

import { useState, useEffect } from "react";
import { Trophy, Calendar, Users, DollarSign, Clock, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { toast } from "sonner";
import Link from "next/link";

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  category: string;
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: { total: number };
  status: 'upcoming' | 'ongoing' | 'ended';
  participants: string[];
  leaderboard?: any[];
  tags?: string[];
  hasJoined?: boolean;
  participantCount?: number;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [featuredCompetition, setFeaturedCompetition] = useState<Competition | null>(null);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/competitions', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCompetitions(data.competitions || []);
        const ongoing = data.competitions?.find((c: Competition) => c.status === 'ongoing' && c.type === 'monthly');
        if (ongoing) setFeaturedCompetition(ongoing);
      } else if (res.status === 401) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to fetch competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCountdown = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const formatCountdown = (endDate: string) => {
    const { days, hours, minutes, seconds } = getCountdown(endDate);
    return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredCompetitions = competitions.filter(comp => {
    if (activeTab === 'all') return true;
    if (activeTab === 'joined') return comp.hasJoined;
    if (activeTab === 'ongoing') return comp.status === 'ongoing';
    if (activeTab === 'ended') return comp.status === 'ended';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Background images for cards - rotate through different images
  const cardBackgrounds = [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', // Trading chart
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80', // Gold coins
    'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80', // Crypto trading
  ];

  const getCardBackground = (index: number) => cardBackgrounds[index % cardBackgrounds.length];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {/* Featured Competition - Stylish Card */}
            {featuredCompetition && (
              <div className="mb-6 relative overflow-hidden rounded-xl border border-border bg-card dark:bg-slate-900/95">
                {/* Background Image with Overlay */}
                <div 
                  className="absolute inset-0 opacity-10 dark:opacity-20"
                  style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/80" />
                
                <div className="relative p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                        {featuredCompetition.type} Competition
                      </p>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3">{featuredCompetition.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm mb-4 sm:mb-6">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(featuredCompetition.status)} animate-pulse`}></span>
                          <span className="text-muted-foreground capitalize">{featuredCompetition.status}</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {((featuredCompetition.leaderboard?.length || 0) + (featuredCompetition.participantCount || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Starts</p>
                          <p className="font-semibold text-foreground text-sm sm:text-base">{new Date(featuredCompetition.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ends</p>
                          <p className="font-semibold text-foreground text-sm sm:text-base">{new Date(featuredCompetition.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ending in</p>
                          <p className="font-semibold font-mono text-emerald-500 text-sm sm:text-lg">{formatCountdown(featuredCompetition.endDate)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        <Link href={`/competitions/${featuredCompetition._id}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white sm:size-default">View</Button>
                        </Link>
                        <Button size="sm" variant="outline" className="sm:size-default">Show Prizepool</Button>
                        <Button size="sm" variant="ghost" className="sm:size-default">More Info</Button>
                      </div>
                    </div>
                    <div className="hidden lg:flex items-center justify-center">
                      <div className="relative">
                        <Trophy className="w-28 h-28 text-primary/40" strokeWidth={1} />
                        <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="joined">Joined</TabsTrigger>
                <TabsTrigger value="all">All Competitions</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="ended">Ended</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Competition Grid */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading competitions...</p>
              </div>
            ) : filteredCompetitions.length === 0 ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
                <Trophy className="w-12 sm:w-16 h-12 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === 'joined' ? 'You haven\'t joined any competitions yet' : 'No competitions found'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCompetitions.map((competition, index) => (
                  <div 
                    key={competition._id} 
                    className="group relative overflow-hidden rounded-xl border border-border bg-card dark:bg-slate-900/95 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                  >
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 opacity-5 dark:opacity-15 group-hover:opacity-10 dark:group-hover:opacity-25 transition-opacity duration-300"
                      style={{
                        backgroundImage: `url(${getCardBackground(index)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/70" />
                    
                    {/* Trophy Icon */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity">
                      <Trophy className="w-12 sm:w-16 h-12 sm:h-16 text-primary" strokeWidth={1} />
                    </div>
                    
                    {/* Content */}
                    <div className="relative p-4 sm:p-5">
                      {/* Countdown Timer */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          {competition.status === 'ongoing' ? formatCountdown(competition.endDate) : competition.status === 'ended' ? 'Ended' : 'Coming Soon'}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(competition.status)} ${competition.status === 'ongoing' ? 'animate-pulse' : ''}`}></span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-bold text-base sm:text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {competition.name}
                      </h3>
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 text-xs sm:text-sm">
                        <span className="text-foreground capitalize">{competition.status}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {competition.entryFee === 0 ? 'Free' : `$${competition.entryFee}`}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {((competition.leaderboard?.length || 0) + (competition.participantCount || 0)).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Tags */}
                      {competition.tags && competition.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                          {competition.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                      
                      {/* View Button */}
                      <Link href={`/competitions/${competition._id}`}>
                        <Button className="w-full" size="sm">
                          View Competition <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Target,
  ArrowUpRight,
  BarChart3,
  Newspaper,
  ExternalLink,
  Clock
} from "lucide-react";

interface UserData {
  name: string;
  email: string;
  userId: string;
}

interface TradeStats {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
}

interface MarketPrice {
  symbol: string;
  name: string;
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
}

const MARKET_SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold', icon: '🥇' },
  { symbol: 'EURUSD', name: 'EUR/USD', icon: '💶' },
  { symbol: 'GBPUSD', name: 'GBP/USD', icon: '💷' },
  { symbol: 'USDJPY', name: 'USD/JPY', icon: '💴' },
  { symbol: 'BTCUSD', name: 'Bitcoin', icon: '₿' },
  { symbol: 'XAGUSD', name: 'Silver', icon: '🥈' },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [stats, setStats] = useState<TradeStats>({
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    totalPnL: 0,
    winRate: 0,
  });
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
    fetchWalletBalance();
    fetchTradeStats();
    fetchMarketPrices();
    fetchNews();
    
    // Refresh market prices every 10 seconds (Finnhub rate limit)
    const interval = setInterval(fetchMarketPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await fetch('/api/user/wallet', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWalletBalance(data.wallet?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchTradeStats = async () => {
    try {
      const res = await fetch('/api/user/trades?status=closed', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.trades) {
        const trades = data.trades;
        const profitable = trades.filter((t: any) => (t.profit || 0) > 0);
        const losing = trades.filter((t: any) => (t.profit || 0) < 0);
        const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
        
        setStats({
          totalTrades: trades.length,
          profitableTrades: profitable.length,
          losingTrades: losing.length,
          totalPnL,
          winRate: trades.length > 0 ? (profitable.length / trades.length) * 100 : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPrices = async () => {
    try {
      // Fetch from Finnhub API
      const symbols = MARKET_SYMBOLS.map(s => s.symbol).join(',');
      const res = await fetch(`/api/finnhub?action=quotes&symbols=${symbols}`);
      const data = await res.json();
      
      if (data.success && data.quotes) {
        const prices: MarketPrice[] = data.quotes.map((quote: any) => {
          const symbolInfo = MARKET_SYMBOLS.find(s => s.symbol === quote.symbol);
          return {
            symbol: quote.symbol,
            name: symbolInfo?.name || quote.symbol,
            current: quote.current,
            change: quote.change || 0,
            changePercent: quote.changePercent || 0,
            high: quote.high || 0,
            low: quote.low || 0,
          };
        });
        setMarketPrices(prices);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/finnhub?action=news&category=general');
      const data = await res.json();
      if (data.success && data.news) {
        setNews(data.news);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* Hero Section with Welcome Message */}
          <div className="relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-background to-background" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute top-20 right-40 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
            
            <div className="relative p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                {/* Welcome Message */}
                <div className="mb-8">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-2">
                    {getGreeting()},
                  </h1>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                    {user?.name || 'Trader'}!
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    NalmiFXs Platform - Your Gateway to Smart Trading
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/')}
                    >
                      Start Trading
                    </Button>
                    <Button 
                      className="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                      onClick={() => router.push('/buy-challenge')}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Buy Challenge
                    </Button>
                  </div>
                </div>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Wallet Balance Card */}
                  <Card className="bg-card border-primary/20 overflow-hidden relative group hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                        {formatCurrency(walletBalance)}
                      </div>
                      <p className="text-muted-foreground text-sm">Wallet Balance</p>
                    </CardContent>
                  </Card>

                  {/* Total Trades Card */}
                  <Card className="bg-card border-blue-500/20 overflow-hidden relative group hover:border-blue-500/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-blue-500" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                        {stats.totalTrades}
                      </div>
                      <p className="text-muted-foreground text-sm">Total Trades</p>
                    </CardContent>
                  </Card>

                  {/* Winning Trades Card */}
                  <Card className="bg-card border-green-500/20 overflow-hidden relative group hover:border-green-500/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-green-500 text-xs font-medium">
                          {stats.winRate.toFixed(1)}% Win
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-500 mb-1">
                        {stats.profitableTrades}
                      </div>
                      <p className="text-muted-foreground text-sm">Winning Trades</p>
                    </CardContent>
                  </Card>

                  {/* Losing Trades Card */}
                  <Card className="bg-card border-red-500/20 overflow-hidden relative group hover:border-red-500/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-red-500 text-xs font-medium">
                          {(100 - stats.winRate).toFixed(1)}% Loss
                        </span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-red-500 mb-1">
                        {stats.losingTrades}
                      </div>
                      <p className="text-muted-foreground text-sm">Losing Trades</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Overall P&L and Platform Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {/* Overall P&L */}
                  <Card className="bg-card border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl">
                          <Trophy className="w-8 h-8 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm mb-1">Overall P&L</p>
                          <div className={`text-3xl sm:text-4xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.totalPnL >= 0 ? '+' : ''}{formatCurrency(stats.totalPnL)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Win Rate */}
                  <Card className="bg-card border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl">
                          <Target className="w-8 h-8 text-cyan-500" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm mb-1">Win Rate</p>
                          <div className="text-3xl sm:text-4xl font-bold text-cyan-500">
                            {stats.winRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Market Prices Table */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">Market Prices</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/')}
                >
                  Trade Now
                </Button>
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-4 sm:px-6 py-4 border-b border-border text-muted-foreground text-sm font-medium">
                  <div className="col-span-2"># Market</div>
                  <div className="text-right">Price</div>
                  <div className="text-right hidden sm:block">High/Low</div>
                  <div className="text-right">Change</div>
                </div>

                {/* Table Body */}
                {marketPrices.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">
                    Loading market prices...
                  </div>
                ) : (
                  marketPrices.map((price, index) => {
                    const icon = MARKET_SYMBOLS.find(s => s.symbol === price.symbol)?.icon || '📊';
                    const isPositive = price.changePercent >= 0;
                    
                    return (
                      <div 
                        key={price.symbol}
                        className="grid grid-cols-5 gap-4 px-4 sm:px-6 py-4 border-b border-border/50 hover:bg-accent/50 transition-colors items-center cursor-pointer"
                        onClick={() => router.push('/')}
                      >
                        <div className="col-span-2 flex items-center gap-3">
                          <span className="text-muted-foreground text-sm w-6">{String(index + 1).padStart(2, '0')}</span>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                            {icon}
                          </div>
                          <div>
                            <div className="text-foreground font-medium text-sm sm:text-base">{price.symbol}</div>
                            <div className="text-muted-foreground text-xs">{price.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-foreground font-medium text-sm sm:text-base">
                            {price.current?.toFixed(price.symbol.includes('JPY') ? 3 : 2) || '0.00'}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-green-500 text-xs">{price.high?.toFixed(2) || '-'}</div>
                          <div className="text-red-500 text-xs">{price.low?.toFixed(2) || '-'}</div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            isPositive 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {isPositive ? '+' : ''}{price.changePercent?.toFixed(2) || '0.00'}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Market News Section */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">Market News</h3>
                </div>
              </div>

              {news.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                  Loading news...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {news.slice(0, 6).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors group"
                    >
                      {item.image && (
                        <div className="relative h-40 overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.headline}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-primary font-medium">{item.source}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.datetime).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-foreground font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {item.headline}
                        </h4>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-1 mt-3 text-primary text-xs">
                          Read more <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}

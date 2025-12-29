"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, BarChart3, PieChart, Activity } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface Trade {
  _id: string;
  userId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  closePrice?: number;
  floatingPnL?: number;
  realizedPnL?: number;
  openedAt: string;
  closedAt?: string;
  status?: string;
  user?: { name: string };
}

interface Analytics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnL: number;
  totalVolume: number;
  uniqueTraders: number;
  winRate: number;
  avgTradeSize: number;
  symbolBreakdown: { name: string; value: number; pnl: number }[];
  sideBreakdown: { name: string; value: number }[];
  dailyPnL: { date: string; pnl: number; trades: number }[];
  topTraders: { userId: number; name: string; trades: number; pnl: number }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function TradeAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [analytics, setAnalytics] = useState<Analytics>({
    totalTrades: 0, openTrades: 0, closedTrades: 0, totalPnL: 0, totalVolume: 0,
    uniqueTraders: 0, winRate: 0, avgTradeSize: 0, symbolBreakdown: [], sideBreakdown: [],
    dailyPnL: [], topTraders: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/trades?limit=2000', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const trades: Trade[] = data.trades || [];
        
        // Filter by period
        const now = new Date();
        const filterDate = new Date();
        if (period === 'today') filterDate.setHours(0, 0, 0, 0);
        else if (period === 'week') filterDate.setDate(now.getDate() - 7);
        else if (period === 'month') filterDate.setMonth(now.getMonth() - 1);
        else if (period === 'year') filterDate.setFullYear(now.getFullYear() - 1);
        
        const filteredTrades = period === 'all' ? trades : trades.filter(t => new Date(t.openedAt) >= filterDate);
        
        // Calculate analytics
        const openTrades = filteredTrades.filter(t => t.status === 'open');
        const closedTrades = filteredTrades.filter(t => t.status === 'closed' || t.status === 'partial');
        const totalPnL = closedTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
        const totalVolume = filteredTrades.reduce((sum, t) => sum + t.lot, 0);
        const uniqueTraders = new Set(filteredTrades.map(t => t.userId)).size;
        const winners = closedTrades.filter(t => (t.realizedPnL || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winners / closedTrades.length) * 100 : 0;
        const avgTradeSize = filteredTrades.length > 0 ? totalVolume / filteredTrades.length : 0;
        
        // Symbol breakdown
        const symbolMap = new Map<string, { count: number; pnl: number }>();
        filteredTrades.forEach(t => {
          const existing = symbolMap.get(t.symbol) || { count: 0, pnl: 0 };
          symbolMap.set(t.symbol, { 
            count: existing.count + 1, 
            pnl: existing.pnl + (t.realizedPnL || t.floatingPnL || 0) 
          });
        });
        const symbolBreakdown = Array.from(symbolMap.entries())
          .map(([name, data]) => ({ name, value: data.count, pnl: data.pnl }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        
        // Side breakdown
        const buyTrades = filteredTrades.filter(t => t.side === 'BUY').length;
        const sellTrades = filteredTrades.filter(t => t.side === 'SELL').length;
        const sideBreakdown = [
          { name: 'BUY', value: buyTrades },
          { name: 'SELL', value: sellTrades }
        ];
        
        // Daily PnL (last 7 days)
        const dailyMap = new Map<string, { pnl: number; trades: number }>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          dailyMap.set(key, { pnl: 0, trades: 0 });
        }
        closedTrades.forEach(t => {
          if (t.closedAt) {
            const key = new Date(t.closedAt).toISOString().split('T')[0];
            if (dailyMap.has(key)) {
              const existing = dailyMap.get(key)!;
              dailyMap.set(key, { pnl: existing.pnl + (t.realizedPnL || 0), trades: existing.trades + 1 });
            }
          }
        });
        const dailyPnL = Array.from(dailyMap.entries()).map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          pnl: parseFloat(data.pnl.toFixed(2)),
          trades: data.trades
        }));
        
        // Top traders
        const traderMap = new Map<number, { name: string; trades: number; pnl: number }>();
        filteredTrades.forEach(t => {
          const existing = traderMap.get(t.userId) || { name: t.user?.name || `User ${t.userId}`, trades: 0, pnl: 0 };
          traderMap.set(t.userId, {
            name: existing.name,
            trades: existing.trades + 1,
            pnl: existing.pnl + (t.realizedPnL || t.floatingPnL || 0)
          });
        });
        const topTraders = Array.from(traderMap.entries())
          .map(([userId, data]) => ({ userId, ...data }))
          .sort((a, b) => b.trades - a.trades)
          .slice(0, 5);
        
        setAnalytics({
          totalTrades: filteredTrades.length,
          openTrades: openTrades.length,
          closedTrades: closedTrades.length,
          totalPnL,
          totalVolume,
          uniqueTraders,
          winRate,
          avgTradeSize,
          symbolBreakdown,
          sideBreakdown,
          dailyPnL,
          topTraders
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Advanced analytics and insights for trading activities</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{analytics.totalTrades}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${analytics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${analytics.totalPnL.toFixed(2)}
                </p>
              </div>
              {analytics.totalPnL >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-blue-500">{analytics.winRate.toFixed(1)}%</p>
              </div>
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Traders</p>
                <p className="text-2xl font-bold">{analytics.uniqueTraders}</p>
              </div>
              <Users className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily P&L Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily P&L (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Symbol Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trades by Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={analytics.symbolBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics.symbolBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number, name: string) => [value, 'Trades']}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buy/Sell Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buy vs Sell</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.sideBreakdown.map((item, i) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={item.name === 'BUY' ? 'text-green-500' : 'text-red-500'}>{item.name}</span>
                    <span>{item.value} trades</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.name === 'BUY' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${analytics.totalTrades > 0 ? (item.value / analytics.totalTrades) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Traders */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topTraders.map((trader, i) => (
                <div key={trader.userId} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{trader.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {trader.userId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{trader.trades} trades</p>
                    <p className={`text-xs ${trader.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${trader.pnl.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {analytics.topTraders.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No traders found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Positions</p>
            <p className="text-xl font-bold text-blue-500">{analytics.openTrades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Closed Trades</p>
            <p className="text-xl font-bold text-green-500">{analytics.closedTrades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-xl font-bold">{analytics.totalVolume.toFixed(2)} lots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Trade Size</p>
            <p className="text-xl font-bold">{analytics.avgTradeSize.toFixed(3)} lots</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


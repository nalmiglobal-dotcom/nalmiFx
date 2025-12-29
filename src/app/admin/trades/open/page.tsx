"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { RefreshCw, Search, X, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

interface Trade {
  _id: string;
  userId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  floatingPnL?: number;
  margin: number;
  openedAt: string;
  user?: { name: string; email: string };
  totalCharges?: number;
  status?: string;
}

export default function OpenPositionsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, totalPnL: 0, totalMargin: 0, uniqueUsers: 0 });

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/admin/trades?status=open&limit=500', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const openTrades = data.trades.filter((t: Trade) => t.status === 'open');
        setTrades(openTrades);
        
        const totalPnL = openTrades.reduce((sum: number, t: Trade) => sum + (t.floatingPnL || 0), 0);
        const totalMargin = openTrades.reduce((sum: number, t: Trade) => sum + (t.margin || 0), 0);
        const uniqueUsers = new Set(openTrades.map((t: Trade) => t.userId)).size;
        
        setStats({ total: openTrades.length, totalPnL, totalMargin, uniqueUsers });
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to close this trade?')) return;
    
    try {
      const res = await fetch(`/api/admin/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Trade closed successfully');
        fetchTrades();
      } else {
        toast.error(data.message || 'Failed to close trade');
      }
    } catch (error) {
      toast.error('Failed to close trade');
    }
  };

  const filteredTrades = trades.filter((trade) =>
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.userId.toString().includes(searchTerm) ||
    trade.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number | undefined, symbol: string) => {
    if (price === undefined) return '-';
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'].some(s => symbol.includes(s))) return price.toFixed(2);
    return price.toFixed(5);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Open Positions</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor all currently open trading positions in real-time</p>
        </div>
        <Button variant="outline" onClick={fetchTrades} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open Trades</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Floating P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </p>
              </div>
              {stats.totalPnL >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Margin</p>
                <p className="text-2xl font-bold">${stats.totalMargin.toFixed(2)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Traders</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Open Positions ({filteredTrades.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading open positions...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No open positions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-right p-2">Lot</th>
                    <th className="text-right p-2">Entry</th>
                    <th className="text-right p-2">Current</th>
                    <th className="text-right p-2">SL</th>
                    <th className="text-right p-2">TP</th>
                    <th className="text-right p-2">P&L</th>
                    <th className="text-right p-2">Margin</th>
                    <th className="text-left p-2">Opened</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-sm">{trade.user?.name || 'Unknown'}</p>
                          <p className="font-mono text-xs text-muted-foreground">ID: {trade.userId}</p>
                        </div>
                      </td>
                      <td className="p-2 font-medium">{trade.symbol}</td>
                      <td className="p-2">
                        <Badge className={trade.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                          {trade.side}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{trade.lot}</td>
                      <td className="p-2 text-right font-mono">{formatPrice(trade.entryPrice, trade.symbol)}</td>
                      <td className="p-2 text-right font-mono">{formatPrice(trade.currentPrice, trade.symbol)}</td>
                      <td className="p-2 text-right font-mono text-red-400">{trade.stopLoss ? formatPrice(trade.stopLoss, trade.symbol) : '-'}</td>
                      <td className="p-2 text-right font-mono text-green-400">{trade.takeProfit ? formatPrice(trade.takeProfit, trade.symbol) : '-'}</td>
                      <td className="p-2 text-right">
                        <span className={`font-bold ${(trade.floatingPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${(trade.floatingPnL || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">${trade.margin?.toFixed(2)}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(trade.openedAt).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleCloseTrade(trade._id)} className="text-red-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


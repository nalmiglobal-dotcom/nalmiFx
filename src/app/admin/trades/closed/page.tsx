"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { RefreshCw, Search, CheckCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Trade {
  _id: string;
  userId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  realizedPnL?: number;
  margin: number;
  openedAt: string;
  closedAt?: string;
  user?: { name: string; email: string };
  totalCharges?: number;
  status?: string;
}

export default function ClosedPositionsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, totalPnL: 0, winners: 0, losers: 0 });

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/trades?status=closed&limit=500', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const closedTrades = data.trades.filter((t: Trade) => t.status === 'closed' || t.status === 'partial');
        setTrades(closedTrades);
        
        const totalPnL = closedTrades.reduce((sum: number, t: Trade) => sum + (t.realizedPnL || 0), 0);
        const winners = closedTrades.filter((t: Trade) => (t.realizedPnL || 0) > 0).length;
        const losers = closedTrades.filter((t: Trade) => (t.realizedPnL || 0) < 0).length;
        
        setStats({ total: closedTrades.length, totalPnL, winners, losers });
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
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

  const winRate = stats.total > 0 ? ((stats.winners / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Closed Positions</h1>
          <p className="text-sm text-muted-foreground mt-1">View all closed trading positions and realized P&L</p>
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
                <p className="text-xs text-muted-foreground">Closed Trades</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Realized P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Winners / Losers</p>
                <p className="text-2xl font-bold">
                  <span className="text-green-500">{stats.winners}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-500">{stats.losers}</span>
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-blue-500">{winRate}%</p>
              </div>
              <TrendingDown className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Closed Positions ({filteredTrades.length})</CardTitle>
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
            <div className="text-center py-8">Loading closed positions...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No closed positions found</div>
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
                    <th className="text-right p-2">Close</th>
                    <th className="text-right p-2">P&L</th>
                    <th className="text-right p-2">Charges</th>
                    <th className="text-left p-2">Opened</th>
                    <th className="text-left p-2">Closed</th>
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
                      <td className="p-2 text-right font-mono">{formatPrice(trade.closePrice, trade.symbol)}</td>
                      <td className="p-2 text-right">
                        <span className={`font-bold ${(trade.realizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${(trade.realizedPnL || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-amber-500">
                        {trade.totalCharges ? `$${trade.totalCharges.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(trade.openedAt).toLocaleString()}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {trade.closedAt ? new Date(trade.closedAt).toLocaleString() : '-'}
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

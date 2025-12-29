"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { RefreshCw, Search, Calendar, Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface Trade {
  _id: string;
  userId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  closePrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  floatingPnL?: number;
  realizedPnL?: number;
  margin: number;
  openedAt: string;
  closedAt?: string;
  user?: { name: string; email: string };
  totalCharges?: number;
  status?: string;
}

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, totalPnL: 0, totalVolume: 0 });

  useEffect(() => {
    fetchTrades();
  }, [dateFilter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/trades?limit=1000', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        let allTrades = data.trades || [];
        
        // Apply date filter
        if (dateFilter !== 'all') {
          const now = new Date();
          const filterDate = new Date();
          if (dateFilter === 'today') filterDate.setHours(0, 0, 0, 0);
          else if (dateFilter === 'week') filterDate.setDate(now.getDate() - 7);
          else if (dateFilter === 'month') filterDate.setMonth(now.getMonth() - 1);
          
          allTrades = allTrades.filter((t: Trade) => new Date(t.openedAt) >= filterDate);
        }
        
        setTrades(allTrades);
        
        const totalPnL = allTrades.reduce((sum: number, t: Trade) => sum + (t.realizedPnL || t.floatingPnL || 0), 0);
        const totalVolume = allTrades.reduce((sum: number, t: Trade) => sum + t.lot, 0);
        
        setStats({ total: allTrades.length, totalPnL, totalVolume });
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId.toString().includes(searchTerm) ||
      trade.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSymbol = symbolFilter === 'all' || trade.symbol === symbolFilter;
    return matchesSearch && matchesSymbol;
  });

  const uniqueSymbols = [...new Set(trades.map(t => t.symbol))];

  const formatPrice = (price: number | undefined, symbol: string) => {
    if (price === undefined) return '-';
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'].some(s => symbol.includes(s))) return price.toFixed(2);
    return price.toFixed(5);
  };

  const exportToCSV = () => {
    const headers = ['User ID', 'User Name', 'Symbol', 'Side', 'Lot', 'Entry', 'Close', 'P&L', 'Status', 'Opened', 'Closed'];
    const rows = filteredTrades.map(t => [
      t.userId,
      t.user?.name || '',
      t.symbol,
      t.side,
      t.lot,
      t.entryPrice,
      t.closePrice || t.currentPrice || '',
      t.realizedPnL || t.floatingPnL || 0,
      t.status,
      t.openedAt,
      t.closedAt || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade History</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete trading history and records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchTrades} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${stats.totalPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} lots</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Trade History ({filteredTrades.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {uniqueSymbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading trade history...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No trades found</div>
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
                    <th className="text-right p-2">Close/Current</th>
                    <th className="text-right p-2">P&L</th>
                    <th className="text-left p-2">Status</th>
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
                      <td className="p-2 text-right font-mono">{formatPrice(trade.closePrice || trade.currentPrice, trade.symbol)}</td>
                      <td className="p-2 text-right">
                        <span className={`font-bold ${(trade.realizedPnL || trade.floatingPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${(trade.realizedPnL || trade.floatingPnL || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                          {trade.status}
                        </Badge>
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


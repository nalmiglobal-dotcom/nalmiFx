"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DollarSign, TrendingUp, BarChart3, RefreshCw } from "lucide-react";

interface IncomeSummary {
  totalSpreadIncome: number;
  totalChargeIncome: number;
  totalIncome: number;
  totalTrades: number;
  totalLots: number;
}

interface SymbolIncome {
  _id: string;
  spreadIncome: number;
  chargeIncome: number;
  totalIncome: number;
  trades: number;
  lots: number;
}

interface Transaction {
  _id: string;
  symbol: string;
  tradeType: string;
  lotSize: number;
  spreadAmount: number;
  chargeAmount: number;
  totalIncome: number;
  createdAt: string;
  userId?: { email: string; fullName: string };
}

export default function BrokerIncomePage() {
  const [period, setPeriod] = useState("today");
  const [summary, setSummary] = useState<IncomeSummary>({
    totalSpreadIncome: 0,
    totalChargeIncome: 0,
    totalIncome: 0,
    totalTrades: 0,
    totalLots: 0,
  });
  const [bySymbol, setBySymbol] = useState<SymbolIncome[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/broker-income?period=${period}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
        setBySymbol(data.data.bySymbol);
        setTransactions(data.data.recentTransactions);
      }
    } catch (error) {
      console.error('Failed to fetch broker income:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Broker Income</h1>
            <p className="text-muted-foreground">Track income from spreads and trading charges</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Spread Income</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalSpreadIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Charge Income</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalChargeIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{summary.totalTrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Lots</p>
                  <p className="text-2xl font-bold">{summary.totalLots.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income by Symbol */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            {bySymbol.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No income data for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Symbol</th>
                      <th className="text-right py-3 px-4 font-medium">Trades</th>
                      <th className="text-right py-3 px-4 font-medium">Lots</th>
                      <th className="text-right py-3 px-4 font-medium">Spread Income</th>
                      <th className="text-right py-3 px-4 font-medium">Charge Income</th>
                      <th className="text-right py-3 px-4 font-medium">Total Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySymbol.map((item) => (
                      <tr key={item._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{item._id}</td>
                        <td className="text-right py-3 px-4">{item.trades}</td>
                        <td className="text-right py-3 px-4">{item.lots.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 text-blue-500">{formatCurrency(item.spreadIncome)}</td>
                        <td className="text-right py-3 px-4 text-purple-500">{formatCurrency(item.chargeIncome)}</td>
                        <td className="text-right py-3 px-4 font-medium text-green-500">{formatCurrency(item.totalIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Time</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Symbol</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-right py-3 px-4 font-medium">Lots</th>
                      <th className="text-right py-3 px-4 font-medium">Spread</th>
                      <th className="text-right py-3 px-4 font-medium">Charge</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {tx.userId?.email || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-medium">{tx.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tx.tradeType === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {tx.tradeType.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">{tx.lotSize.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 text-blue-500">{formatCurrency(tx.spreadAmount)}</td>
                        <td className="text-right py-3 px-4 text-purple-500">{formatCurrency(tx.chargeAmount)}</td>
                        <td className="text-right py-3 px-4 font-medium text-green-500">{formatCurrency(tx.totalIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

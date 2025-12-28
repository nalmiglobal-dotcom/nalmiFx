"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { 
  DollarSign, TrendingUp, Search, RefreshCw, Filter, 
  Download, Eye, Calendar, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";

interface TradeCharge {
  _id: string;
  tradeId: string;
  userId: number;
  userName: string;
  userEmail: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  status: string;
  openedAt: string;
  closedAt?: string;
  spreadPips: number;
  spreadCost: number;
  chargeType: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount: number;
  totalCharges: number;
}

interface Summary {
  totalTrades: number;
  totalSpreadIncome: number;
  totalCommissionIncome: number;
  totalChargesCollected: number;
  currentSettings?: {
    globalSpreadPips: number;
    globalChargeType: string;
    globalChargeAmount: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const SYMBOLS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD",
  "AUDUSD", "NZDUSD", "USDCAD", "US30", "NAS100", "XAGUSD"
];

export default function ChargeHistoryPage() {
  const [charges, setCharges] = useState<TradeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50, pages: 0 });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Detail dialog
  const [selectedCharge, setSelectedCharge] = useState<TradeCharge | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchCharges();
  }, [pagination.page, symbolFilter, startDate, endDate]);

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (symbolFilter && symbolFilter !== 'all') params.append('symbol', symbolFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/trade-charges?${params.toString()}`, { 
        credentials: 'include' 
      });
      const data = await res.json();

      if (data.success) {
        setCharges(data.charges || []);
        setPagination(data.pagination);
        setSummary(data.summary);
      } else {
        toast.error(data.message || 'Failed to fetch charges');
      }
    } catch (error) {
      toast.error('Failed to fetch charges');
    } finally {
      setLoading(false);
    }
  };

  const filteredCharges = charges.filter((charge) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      charge.symbol.toLowerCase().includes(term) ||
      charge.userId.toString().includes(term) ||
      charge.userName.toLowerCase().includes(term) ||
      charge.userEmail.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatPrice = (price: number) => {
    if (price === undefined || price === null) return '-';
    return price.toFixed(price < 10 ? 5 : 2);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getChargeTypeLabel = (type: string) => {
    switch (type) {
      case 'per_lot': return 'Per Lot';
      case 'per_execution': return 'Per Trade';
      case 'percentage': return 'Percentage';
      default: return type;
    }
  };

  const openDetail = (charge: TradeCharge) => {
    setSelectedCharge(charge);
    setDetailOpen(true);
  };

  const exportToCSV = () => {
    if (charges.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'User ID', 'User Name', 'Symbol', 'Side', 'Lot', 'Entry Price', 'Spread (Pips)', 'Spread Cost', 'Charge Type', 'Commission', 'Total Charges', 'Status'];
    const rows = charges.map(c => [
      formatDate(c.openedAt),
      c.userId,
      c.userName,
      c.symbol,
      c.side,
      c.lot,
      c.entryPrice,
      c.spreadPips,
      c.spreadCost.toFixed(2),
      getChargeTypeLabel(c.chargeType),
      c.chargeAmount.toFixed(2),
      c.totalCharges.toFixed(2),
      c.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-charges-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export completed');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade Charge History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all trade charges including spreads and commissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCharges}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Trades with Charges</p>
                <p className="text-2xl font-bold">{summary?.totalTrades || 0}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Spread Income</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(summary?.totalSpreadIncome || 0)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Commission Income</p>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrency(summary?.totalCommissionIncome || 0)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Charges Collected</p>
                <p className="text-2xl font-bold text-amber-500">
                  {formatCurrency(summary?.totalChargesCollected || 0)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Settings Info */}
      {summary?.currentSettings && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">Current Settings:</span>
              <span>
                <strong>Global Spread:</strong> {summary.currentSettings.globalSpreadPips} pips
              </span>
              <span>
                <strong>Charge Type:</strong> {getChargeTypeLabel(summary.currentSettings.globalChargeType)}
              </span>
              <span>
                <strong>Charge Amount:</strong> ${summary.currentSettings.globalChargeAmount}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User ID, name, symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All symbols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {SYMBOLS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charges Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trade Charges</CardTitle>
              <CardDescription>
                Showing {filteredCharges.length} of {pagination.total} total records
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading charges...</div>
          ) : filteredCharges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trade charges found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Lot</th>
                    <th className="text-left p-2">Entry</th>
                    <th className="text-left p-2">Spread</th>
                    <th className="text-left p-2">Spread Cost</th>
                    <th className="text-left p-2">Commission</th>
                    <th className="text-left p-2">Total Charges</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharges.map((charge) => (
                    <tr key={charge._id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-xs text-muted-foreground">
                        {formatDate(charge.openedAt)}
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-mono text-xs">{charge.userId}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {charge.userName}
                          </p>
                        </div>
                      </td>
                      <td className="p-2 font-medium">{charge.symbol}</td>
                      <td className="p-2">
                        <Badge className={charge.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                          {charge.side}
                        </Badge>
                      </td>
                      <td className="p-2">{charge.lot}</td>
                      <td className="p-2 font-mono">{formatPrice(charge.entryPrice)}</td>
                      <td className="p-2">
                        <span className="text-amber-500 font-medium">
                          {charge.spreadPips} pips
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-green-500 font-medium">
                          {formatCurrency(charge.spreadCost)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-blue-500 font-medium">
                          {formatCurrency(charge.chargeAmount)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="font-bold text-amber-500">
                          {formatCurrency(charge.totalCharges)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant={charge.status === 'open' ? 'default' : 'secondary'}>
                          {charge.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(charge)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charge Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trade Charge Details</DialogTitle>
            <DialogDescription>
              Full breakdown of charges for this trade
            </DialogDescription>
          </DialogHeader>
          {selectedCharge && (
            <div className="space-y-4">
              {/* Trade Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Trade Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>{' '}
                    <span className="font-medium">{selectedCharge.symbol}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Side:</span>{' '}
                    <Badge className={selectedCharge.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                      {selectedCharge.side}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lot Size:</span>{' '}
                    <span className="font-medium">{selectedCharge.lot}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entry Price:</span>{' '}
                    <span className="font-mono">{formatPrice(selectedCharge.entryPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge variant="outline">{selectedCharge.status}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opened:</span>{' '}
                    <span className="text-xs">{formatDate(selectedCharge.openedAt)}</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium text-sm">User Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">User ID:</span>{' '}
                    <span className="font-mono">{selectedCharge.userId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{selectedCharge.userName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span>{selectedCharge.userEmail}</span>
                  </div>
                </div>
              </div>

              {/* Charge Breakdown */}
              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Charge Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Spread Applied</span>
                    <span className="font-medium text-amber-500">{selectedCharge.spreadPips} pips</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Spread Cost</span>
                    <span className="font-medium text-green-500">{formatCurrency(selectedCharge.spreadCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      Commission ({getChargeTypeLabel(selectedCharge.chargeType)})
                    </span>
                    <span className="font-medium text-blue-500">{formatCurrency(selectedCharge.chargeAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-amber-500/10 px-2 rounded">
                    <span className="font-medium">Total Charges Deducted</span>
                    <span className="font-bold text-amber-500 text-lg">{formatCurrency(selectedCharge.totalCharges)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


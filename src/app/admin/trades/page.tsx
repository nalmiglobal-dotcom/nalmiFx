"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { 
  TrendingUp, TrendingDown, Search, Edit, Trash2, RefreshCw, 
  Clock, CheckCircle, XCircle, Plus, MoreVertical, Eye
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
  currentPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'open' | 'closed' | 'partial';
  floatingPnL?: number;
  realizedPnL?: number;
  margin: number;
  leverage: number;
  openedAt: string;
  closedAt?: string;
  user?: { name: string; email: string };
  // Charge fields
  spreadPips?: number;
  spreadCost?: number;
  chargeType?: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount?: number;
  totalCharges?: number;
}

interface Stats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnL: number;
}

interface AllStats {
  total: number;
  open: number;
  closed: number;
  pending: number;
  totalPnL: number;
}

export default function TradesPage() {
  const { confirm, Dialog: ConfirmDialog } = useConfirmationDialog();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState<AllStats>({ total: 0, open: 0, closed: 0, pending: 0, totalPnL: 0 });
  
  // Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editForm, setEditForm] = useState({
    entryPrice: "",
    closePrice: "",
    lot: "",
    stopLoss: "",
    takeProfit: "",
    status: "",
    openedAt: "",
    closedAt: "",
    realizedPnL: "",
  });

  // Create Trade Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: "",
    symbol: "XAUUSD",
    side: "BUY",
    lot: "0.01",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [activeFilter]);

  const fetchStats = async () => {
    try {
      // Fetch all trades to get accurate stats
      const res = await fetch('/api/admin/trades?limit=1000', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const allTrades = data.trades || [];
        const openTrades = allTrades.filter((t: Trade) => t.status === 'open');
        const closedTrades = allTrades.filter((t: Trade) => t.status === 'closed' || t.status === 'partial');
        const totalPnL = closedTrades.reduce((sum: number, t: Trade) => sum + (t.realizedPnL || 0), 0);
        
        setStats({
          total: allTrades.length,
          open: openTrades.length,
          closed: closedTrades.length,
          pending: (data.pendingOrders || []).length,
          totalPnL,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilter !== 'all' && activeFilter !== 'pending') {
        params.append('status', activeFilter);
      }
      params.append('limit', '200');
      
      const res = await fetch(`/api/admin/trades?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        let filteredTrades = data.trades || [];
        
        // Apply client-side filtering based on activeFilter
        if (activeFilter === 'open') {
          filteredTrades = filteredTrades.filter((t: Trade) => t.status === 'open');
        } else if (activeFilter === 'closed' || activeFilter === 'history') {
          filteredTrades = filteredTrades.filter((t: Trade) => t.status === 'closed' || t.status === 'partial');
        }
        
        setTrades(filteredTrades);
        setPendingOrders(data.pendingOrders || []);
      } else {
        toast.error(data.message || 'Failed to fetch trades');
      }
    } catch (error) {
      toast.error('Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (trade: Trade) => {
    setSelectedTrade(trade);
    setEditForm({
      entryPrice: trade.entryPrice.toString(),
      closePrice: trade.closePrice?.toString() || "",
      lot: trade.lot.toString(),
      stopLoss: trade.stopLoss?.toString() || "",
      takeProfit: trade.takeProfit?.toString() || "",
      status: trade.status,
      openedAt: trade.openedAt ? new Date(trade.openedAt).toISOString().slice(0, 16) : "",
      closedAt: trade.closedAt ? new Date(trade.closedAt).toISOString().slice(0, 16) : "",
      realizedPnL: trade.realizedPnL?.toString() || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateTrade = async () => {
    if (!selectedTrade) return;
    
    try {
      const updateData: any = {};
      
      if (editForm.entryPrice) updateData.entryPrice = parseFloat(editForm.entryPrice);
      if (editForm.closePrice) updateData.closePrice = parseFloat(editForm.closePrice);
      if (editForm.lot) updateData.lot = parseFloat(editForm.lot);
      if (editForm.stopLoss) updateData.stopLoss = parseFloat(editForm.stopLoss);
      if (editForm.takeProfit) updateData.takeProfit = parseFloat(editForm.takeProfit);
      if (editForm.status) updateData.status = editForm.status;
      if (editForm.openedAt) updateData.openedAt = editForm.openedAt;
      if (editForm.closedAt) updateData.closedAt = editForm.closedAt;
      if (editForm.realizedPnL) updateData.realizedPnL = parseFloat(editForm.realizedPnL);

      const res = await fetch(`/api/admin/trades/${selectedTrade._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || 'Trade updated successfully');
        setEditDialogOpen(false);
        setSelectedTrade(null);
        fetchTrades();
      } else {
        toast.error(data.message || 'Failed to update trade');
      }
    } catch (error) {
      toast.error('Failed to update trade');
    }
  };

  const handleCreateTrade = async () => {
    if (!createForm.userId || !createForm.entryPrice) {
      toast.error('User ID and Entry Price are required');
      return;
    }

    try {
      const res = await fetch('/api/admin/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(createForm.userId),
          symbol: createForm.symbol,
          side: createForm.side,
          lot: parseFloat(createForm.lot),
          entryPrice: parseFloat(createForm.entryPrice),
          stopLoss: createForm.stopLoss ? parseFloat(createForm.stopLoss) : undefined,
          takeProfit: createForm.takeProfit ? parseFloat(createForm.takeProfit) : undefined,
        }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Trade created successfully');
        setCreateDialogOpen(false);
        setCreateForm({ userId: "", symbol: "XAUUSD", side: "BUY", lot: "0.01", entryPrice: "", stopLoss: "", takeProfit: "" });
        fetchTrades();
      } else {
        toast.error(data.message || 'Failed to create trade');
      }
    } catch (error) {
      toast.error('Failed to create trade');
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    confirm(
      "Delete Trade",
      "Are you sure you want to delete this trade? This will also reverse any wallet changes. This action cannot be undone.",
      async () => {
        try {
          const res = await fetch(`/api/admin/trades/${tradeId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          
          const data = await res.json();
          
          if (data.success) {
            toast.success('Trade deleted successfully');
            fetchTrades();
          } else {
            toast.error(data.message || 'Failed to delete trade');
          }
        } catch (error) {
          toast.error('Failed to delete trade');
        }
      },
      {
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      }
    );
  };

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId.toString().includes(searchTerm) ||
      trade.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'pending') return false;
    return matchesSearch;
  });

  const displayData = activeFilter === 'pending' ? pendingOrders : filteredTrades;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '-';
    return price.toFixed(price < 10 ? 5 : 2);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage all trading activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTrades}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Trade
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`cursor-pointer ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setActiveFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">All Trades</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'open' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setActiveFilter('open')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'closed' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setActiveFilter('closed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Closed Positions</p>
                <p className="text-2xl font-bold text-green-500">{stats.closed}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'pending' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setActiveFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              </div>
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'history' ? 'ring-2 ring-purple-500' : ''}`} onClick={() => setActiveFilter('history')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Trade History</p>
                <p className="text-2xl font-bold text-purple-500">{stats.closed}</p>
              </div>
              <TrendingDown className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total PnL Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Realized P&L (Closed Trades)</span>
            <span className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${stats.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {activeFilter === 'all' && 'All Trades'}
                {activeFilter === 'open' && 'Open Positions'}
                {activeFilter === 'closed' && 'Closed Positions'}
                {activeFilter === 'pending' && 'Pending Orders'}
                {activeFilter === 'history' && 'Trade History'}
              </CardTitle>
              <CardDescription>Showing {displayData.length} items</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol, user ID, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading trades...</div>
          ) : displayData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No trades found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Lot</th>
                    <th className="text-left p-2">Entry</th>
                    <th className="text-left p-2">{activeFilter === 'closed' ? 'Close' : 'Current'}</th>
                    <th className="text-left p-2">SL</th>
                    <th className="text-left p-2">TP</th>
                    <th className="text-left p-2">P&L</th>
                    <th className="text-left p-2">Charges</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Opened</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((trade: any) => (
                    <tr key={trade._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-mono text-xs">{trade.userId}</p>
                          {trade.user && <p className="text-xs text-muted-foreground">{trade.user.name}</p>}
                        </div>
                      </td>
                      <td className="p-2 font-medium">{trade.symbol}</td>
                      <td className="p-2">
                        <Badge className={trade.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                          {trade.side}
                        </Badge>
                      </td>
                      <td className="p-2">{trade.lot}</td>
                      <td className="p-2 font-mono">{formatPrice(trade.entryPrice)}</td>
                      <td className="p-2 font-mono">
                        {trade.status === 'closed' ? formatPrice(trade.closePrice) : formatPrice(trade.currentPrice)}
                      </td>
                      <td className="p-2 font-mono text-red-400">{trade.stopLoss ? formatPrice(trade.stopLoss) : '-'}</td>
                      <td className="p-2 font-mono text-green-400">{trade.takeProfit ? formatPrice(trade.takeProfit) : '-'}</td>
                      <td className="p-2">
                        <span className={`font-bold ${
                          (trade.status === 'closed' ? trade.realizedPnL : trade.floatingPnL) >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          ${(trade.status === 'closed' ? trade.realizedPnL : trade.floatingPnL)?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="p-2">
                        {(trade.totalCharges || 0) > 0 ? (
                          <div className="text-xs">
                            <span className="text-amber-500 font-medium">
                              ${trade.totalCharges?.toFixed(2)}
                            </span>
                            <div className="text-muted-foreground">
                              {trade.spreadPips ? `${trade.spreadPips}p` : ''}
                              {trade.chargeAmount && trade.chargeAmount > 0 ? ` +$${trade.chargeAmount.toFixed(2)}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant={trade.status === 'open' ? 'default' : trade.status === 'closed' ? 'secondary' : 'outline'}>
                          {trade.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{formatDate(trade.openedAt || trade.createdAt)}</td>
                      <td className="p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(trade)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit Trade
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteTrade(trade._id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Trade
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Trade Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Trade</DialogTitle>
            <DialogDescription>
              Modify trade details for {selectedTrade?.symbol} ({selectedTrade?.side})
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Entry Price</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={editForm.entryPrice} 
                onChange={(e) => setEditForm({ ...editForm, entryPrice: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Close Price</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={editForm.closePrice} 
                onChange={(e) => setEditForm({ ...editForm, closePrice: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Lot Size</Label>
              <Input 
                type="number" 
                step="0.01"
                value={editForm.lot} 
                onChange={(e) => setEditForm({ ...editForm, lot: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={editForm.stopLoss} 
                onChange={(e) => setEditForm({ ...editForm, stopLoss: e.target.value })} 
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Take Profit</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={editForm.takeProfit} 
                onChange={(e) => setEditForm({ ...editForm, takeProfit: e.target.value })} 
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Opened At</Label>
              <Input 
                type="datetime-local" 
                value={editForm.openedAt} 
                onChange={(e) => setEditForm({ ...editForm, openedAt: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Closed At</Label>
              <Input 
                type="datetime-local" 
                value={editForm.closedAt} 
                onChange={(e) => setEditForm({ ...editForm, closedAt: e.target.value })} 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Realized P&L (for closed trades)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={editForm.realizedPnL} 
                onChange={(e) => setEditForm({ ...editForm, realizedPnL: e.target.value })} 
                placeholder="Auto-calculated if close price is set"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTrade}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Trade Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Trade</DialogTitle>
            <DialogDescription>Create a new trade for a user</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>User ID *</Label>
              <Input 
                type="number" 
                value={createForm.userId} 
                onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })} 
                placeholder="e.g., 100001"
              />
            </div>
            <div className="space-y-2">
              <Label>Symbol *</Label>
              <Select value={createForm.symbol} onValueChange={(v) => setCreateForm({ ...createForm, symbol: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XAUUSD">XAUUSD</SelectItem>
                  <SelectItem value="BTCUSD">BTCUSD</SelectItem>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                  <SelectItem value="NAS100">NAS100</SelectItem>
                  <SelectItem value="US30">US30</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Side *</Label>
              <Select value={createForm.side} onValueChange={(v) => setCreateForm({ ...createForm, side: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lot Size *</Label>
              <Input 
                type="number" 
                step="0.01"
                value={createForm.lot} 
                onChange={(e) => setCreateForm({ ...createForm, lot: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Entry Price *</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={createForm.entryPrice} 
                onChange={(e) => setCreateForm({ ...createForm, entryPrice: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={createForm.stopLoss} 
                onChange={(e) => setCreateForm({ ...createForm, stopLoss: e.target.value })} 
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Take Profit</Label>
              <Input 
                type="number" 
                step="0.00001"
                value={createForm.takeProfit} 
                onChange={(e) => setCreateForm({ ...createForm, takeProfit: e.target.value })} 
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTrade}>Create Trade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}

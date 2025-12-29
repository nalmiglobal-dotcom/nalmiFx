"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { RefreshCw, Search, Clock, X, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

interface PendingOrder {
  _id: string;
  userId: number;
  symbol: string;
  orderType: 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  side: 'BUY' | 'SELL';
  lot: number;
  triggerPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  margin: number;
  status: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, totalMargin: 0, uniqueUsers: 0 });

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/trades?limit=500', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const pendingOrders = data.pendingOrders || [];
        setOrders(pendingOrders);
        
        const totalMargin = pendingOrders.reduce((sum: number, o: PendingOrder) => sum + (o.margin || 0), 0);
        const uniqueUsers = new Set(pendingOrders.map((o: PendingOrder) => o.userId)).size;
        
        setStats({ total: pendingOrders.length, totalMargin, uniqueUsers });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this pending order?')) return;
    
    try {
      const res = await fetch(`/api/user/pending-orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Order cancelled successfully');
        fetchOrders();
      } else {
        toast.error(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.userId.toString().includes(searchTerm) ||
    order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number | undefined, symbol: string) => {
    if (price === undefined) return '-';
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'].some(s => symbol.includes(s))) return price.toFixed(2);
    return price.toFixed(5);
  };

  const formatOrderType = (type: string) => type.replace('_', ' ').toUpperCase();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pending Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all pending limit and stop orders</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-amber-500">{stats.total}</p>
              </div>
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reserved Margin</p>
                <p className="text-2xl font-bold">${stats.totalMargin.toFixed(2)}</p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Users with Orders</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Orders ({filteredOrders.length})</CardTitle>
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
            <div className="text-center py-8">Loading pending orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Lot</th>
                    <th className="text-right p-2">Trigger Price</th>
                    <th className="text-right p-2">SL</th>
                    <th className="text-right p-2">TP</th>
                    <th className="text-right p-2">Margin</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-sm">{order.user?.name || 'Unknown'}</p>
                          <p className="font-mono text-xs text-muted-foreground">ID: {order.userId}</p>
                        </div>
                      </td>
                      <td className="p-2 font-medium">{order.symbol}</td>
                      <td className="p-2">
                        <Badge className={order.orderType.includes('buy') ? 'bg-green-500' : 'bg-red-500'}>
                          {formatOrderType(order.orderType)}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{order.lot}</td>
                      <td className="p-2 text-right font-mono text-amber-500">{formatPrice(order.triggerPrice, order.symbol)}</td>
                      <td className="p-2 text-right font-mono text-red-400">{order.stopLoss ? formatPrice(order.stopLoss, order.symbol) : '-'}</td>
                      <td className="p-2 text-right font-mono text-green-400">{order.takeProfit ? formatPrice(order.takeProfit, order.symbol) : '-'}</td>
                      <td className="p-2 text-right font-mono text-muted-foreground">${order.margin?.toFixed(2)}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleCancelOrder(order._id)} className="text-red-500 hover:text-red-600">
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


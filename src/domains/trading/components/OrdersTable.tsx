"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useGlobalConfirmationDialog } from "@/shared/components/ui/global-confirmation-dialog";

interface Trade {
  _id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  currentPrice: number;
  floatingPnL: number;
  realizedPnL?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  closedAt?: string;
  closePrice?: number;
  status: 'open' | 'closed' | 'partial';
  closedLot?: number;
  // Charge details
  spreadPips?: number;
  spreadCost?: number;
  chargeAmount?: number;
  totalCharges?: number;
  margin?: number;
}

interface PendingOrder {
  _id: string;
  symbol: string;
  orderType: 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  side: 'BUY' | 'SELL';
  lot: number;
  triggerPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
  createdAt: string;
  margin: number;
}

interface WalletData {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
}

interface OrdersTableProps {
  isExpanded: boolean;
  onToggle: () => void;
  challengeAccountId?: string | null;
  fullHeight?: boolean;
}

export function OrdersTable({ isExpanded, onToggle, challengeAccountId, fullHeight = false }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<"positions" | "pending" | "history" | "cancelled">("positions");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const { confirm } = useGlobalConfirmationDialog();
  
  // Edit SL/TP state
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editSL, setEditSL] = useState<string>('');
  const [editTP, setEditTP] = useState<string>('');
  const [savingModify, setSavingModify] = useState(false);
  
  // Track active challenge account from localStorage
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(challengeAccountId || null);

  // Get current challenge ID (always reads from localStorage for accuracy)
  const getCurrentChallengeId = () => {
    return localStorage.getItem('activeChallengeAccountId');
  };

  useEffect(() => {
    // Check localStorage on mount
    const storedId = localStorage.getItem('activeChallengeAccountId');
    setActiveChallengeId(storedId);

    const handleChallengeChange = (e: CustomEvent) => {
      console.log('[OrdersTable] Challenge account changed:', e.detail);
      if (e.detail) {
        setActiveChallengeId(e.detail._id);
      } else {
        setActiveChallengeId(null);
      }
    };

    // Also listen for storage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeChallengeAccountId') {
        console.log('[OrdersTable] Storage changed:', e.newValue);
        setActiveChallengeId(e.newValue);
      }
    };

    window.addEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const handleTradeEvent = () => fetchData();
    window.addEventListener('tradeCreated', handleTradeEvent);
    window.addEventListener('tradeClosed', handleTradeEvent);
    window.addEventListener('pendingOrderExecuted', handleTradeEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tradeCreated', handleTradeEvent);
      window.removeEventListener('tradeClosed', handleTradeEvent);
      window.removeEventListener('pendingOrderExecuted', handleTradeEvent);
    };
  }, [activeTab, activeChallengeId]);

  const fetchData = async () => {
    try {
      // Fetch wallet data
      const walletRes = await fetch('/api/user/wallet', { credentials: 'include' });
      const walletData = await walletRes.json();
      if (walletData.success) setWallet(walletData.wallet);

      // Always read from localStorage to get the current challenge ID
      const currentChallengeId = getCurrentChallengeId();
      const challengeParam = currentChallengeId ? `&challengeAccountId=${currentChallengeId}` : '';

      if (activeTab === 'pending') {
        const res = await fetch(`/api/user/pending-orders?status=pending${challengeParam}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setPendingOrders(data.orders || []);
      } else if (activeTab === 'cancelled') {
        const res = await fetch(`/api/user/pending-orders?status=cancelled${challengeParam}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setPendingOrders(data.orders || []);
      } else {
        const status = activeTab === 'positions' ? 'open' : 'closed';
        const res = await fetch(`/api/user/trades?status=${status}${challengeParam}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTrade = async (tradeId: string, symbol: string) => {
    confirm(
      "Close Trade",
      `Are you sure you want to close ${symbol} trade?`,
      async () => {
        try {
          const res = await fetch(`/api/user/trades/${tradeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (data.success) {
            toast.success(`Closed. PnL: $${data.realizedPnL.toFixed(2)}`);
            fetchData();
          } else {
            toast.error(data.message || 'Failed to close');
          }
        } catch (error) {
          toast.error('Failed to close trade');
        }
      },
      {
        confirmText: "Close Trade",
        cancelText: "Cancel",
        variant: "default",
      }
    );
  };

  const startEditingSLTP = (trade: Trade) => {
    setEditingTradeId(trade._id);
    setEditSL(trade.stopLoss?.toString() || '');
    setEditTP(trade.takeProfit?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingTradeId(null);
    setEditSL('');
    setEditTP('');
  };

  const handleModifySLTP = async (tradeId: string) => {
    setSavingModify(true);
    try {
      const payload: { stopLoss?: number; takeProfit?: number } = {};
      if (editSL) payload.stopLoss = parseFloat(editSL);
      if (editTP) payload.takeProfit = parseFloat(editTP);
      
      const res = await fetch(`/api/user/trades/${tradeId}/modify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('SL/TP updated successfully');
        fetchData();
        cancelEditing();
        // Dispatch event to update chart lines
        window.dispatchEvent(new CustomEvent('tradeModified'));
      } else {
        toast.error(data.message || 'Failed to modify');
      }
    } catch (error) {
      toast.error('Failed to modify trade');
    } finally {
      setSavingModify(false);
    }
  };

  const handleCancelPendingOrder = async (orderId: string, symbol: string) => {
    confirm(
      "Cancel Pending Order",
      `Are you sure you want to cancel pending ${symbol} order?`,
      async () => {
        try {
          const res = await fetch(`/api/user/pending-orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            toast.success('Pending order cancelled');
            fetchData();
          } else {
            toast.error(data.message || 'Failed to cancel');
          }
        } catch (error) {
          toast.error('Failed to cancel order');
        }
      },
      {
        confirmText: "Cancel Order",
        cancelText: "Keep Order",
        variant: "default",
      }
    );
  };

  const openTrades = trades.filter((t) => t.status === 'open');
  const closedTrades = trades.filter((t) => t.status === 'closed' || t.status === 'partial');
  const totalPnL = openTrades.reduce((acc, t) => acc + t.floatingPnL, 0);

  const formatPrice = (price: number, sym: string) => {
    if (sym.includes('JPY')) return price.toFixed(3);
    if (sym.includes('XAU') || sym.includes('XAG')) return price.toFixed(2);
    if (sym.includes('BTC') || sym.includes('ETH')) return price.toFixed(2);
    return price.toFixed(5);
  };

  const formatOrderType = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  const displayTrades = activeTab === 'positions' ? openTrades : activeTab === 'history' ? closedTrades : [];

  const tabs = [
    { key: 'positions' as const, label: 'Positions', count: openTrades.length },
    { key: 'pending' as const, label: 'Pending', count: pendingOrders.length },
    { key: 'history' as const, label: 'History 24H', count: closedTrades.length },
    { key: 'cancelled' as const, label: 'Cancelled 24H', count: 0 },
  ];

  const getHeight = () => {
    if (fullHeight) return '100%';
    return isExpanded ? 'calc(33vh)' : '36px';
  };

  return (
    <div className={`bg-card border-t border-border flex flex-col shrink-0 ${fullHeight ? 'flex-1 h-full' : ''}`} style={{ height: getHeight() }}>
      {/* Tabs Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border bg-secondary/30 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Account Type Badge - shows which account's trades are displayed */}
          {activeChallengeId ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-500 rounded mr-2 whitespace-nowrap">
              CHALLENGE
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-500 rounded mr-2 whitespace-nowrap">
              WALLET
            </span>
          )}
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key 
                  ? "text-foreground bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
          </span>
          <button 
            onClick={onToggle} 
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>
          ) : activeTab === 'pending' ? (
            pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="text-2xl mb-1 opacity-30">⏳</div>
                <p className="text-xs">No pending orders</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 sticky top-0">
                  <tr className="text-muted-foreground">
                    <th className="text-left px-3 py-1 font-medium">Time</th>
                    <th className="text-left px-3 py-1 font-medium">Symbol</th>
                    <th className="text-left px-3 py-1 font-medium">Type</th>
                    <th className="text-right px-3 py-1 font-medium">Lots</th>
                    <th className="text-right px-3 py-1 font-medium">Trigger Price</th>
                    <th className="text-right px-3 py-1 font-medium">SL</th>
                    <th className="text-right px-3 py-1 font-medium">TP</th>
                    <th className="text-right px-3 py-1 font-medium">Margin</th>
                    <th className="text-center px-3 py-1 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map((order) => (
                    <tr key={order._id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-3 py-1 text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-1 font-medium text-foreground">{order.symbol}</td>
                      <td className="px-3 py-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          order.orderType.includes('buy') ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        }`}>
                          {formatOrderType(order.orderType)}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-right font-mono text-foreground">{order.lot.toFixed(2)}</td>
                      <td className="px-3 py-1 text-right font-mono text-yellow-500">{formatPrice(order.triggerPrice, order.symbol)}</td>
                      <td className="px-3 py-1 text-right font-mono text-red-400/70">{order.stopLoss ? formatPrice(order.stopLoss, order.symbol) : '-'}</td>
                      <td className="px-3 py-1 text-right font-mono text-green-400/70">{order.takeProfit ? formatPrice(order.takeProfit, order.symbol) : '-'}</td>
                      <td className="px-3 py-1 text-right font-mono text-muted-foreground">${order.margin.toFixed(2)}</td>
                      <td className="px-3 py-1 text-center">
                        <button
                          onClick={() => handleCancelPendingOrder(order._id, order.symbol)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Cancel order"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : displayTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="text-2xl mb-1 opacity-30">📊</div>
              <p className="text-xs">No {activeTab} trades</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="text-muted-foreground">
                  <th className="text-left px-3 py-1 font-medium">Time</th>
                  <th className="text-left px-3 py-1 font-medium">Symbol</th>
                  <th className="text-left px-3 py-1 font-medium">Side</th>
                  <th className="text-right px-3 py-1 font-medium">Lots</th>
                  <th className="text-right px-3 py-1 font-medium">Entry</th>
                  <th className="text-right px-3 py-1 font-medium">{activeTab === 'history' ? 'Close' : 'Current'}</th>
                  <th className="text-right px-3 py-1 font-medium">SL</th>
                  <th className="text-right px-3 py-1 font-medium">TP</th>
                  <th className="text-right px-3 py-1 font-medium">Charges</th>
                  <th className="text-right px-3 py-1 font-medium">P/L</th>
                  <th className="text-center px-3 py-1 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {displayTrades.map((trade) => (
                  <tr key={trade._id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-3 py-1 text-muted-foreground whitespace-nowrap">
                      {activeTab === 'history' && trade.closedAt 
                        ? new Date(trade.closedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : new Date(trade.openedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      }
                    </td>
                    <td className="px-3 py-1 font-medium text-foreground">{trade.symbol}</td>
                    <td className="px-3 py-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${trade.side === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-foreground">{trade.lot.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right font-mono text-muted-foreground">{formatPrice(trade.entryPrice, trade.symbol)}</td>
                    <td className="px-3 py-1 text-right font-mono text-muted-foreground">
                      {activeTab === 'history' && trade.closePrice 
                        ? formatPrice(trade.closePrice, trade.symbol)
                        : formatPrice(trade.currentPrice, trade.symbol)
                      }
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-red-400/70">
                      {activeTab === 'positions' && editingTradeId === trade._id ? (
                        <input
                          type="number"
                          step="any"
                          value={editSL}
                          onChange={(e) => setEditSL(e.target.value)}
                          placeholder="SL"
                          className="w-20 px-1.5 py-0.5 bg-secondary border border-red-500/50 rounded text-[11px] text-red-400 font-mono text-right focus:outline-none focus:border-red-500"
                        />
                      ) : (
                        trade.stopLoss ? formatPrice(trade.stopLoss, trade.symbol) : '-'
                      )}
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-green-400/70">
                      {activeTab === 'positions' && editingTradeId === trade._id ? (
                        <input
                          type="number"
                          step="any"
                          value={editTP}
                          onChange={(e) => setEditTP(e.target.value)}
                          placeholder="TP"
                          className="w-20 px-1.5 py-0.5 bg-secondary border border-green-500/50 rounded text-[11px] text-green-400 font-mono text-right focus:outline-none focus:border-green-500"
                        />
                      ) : (
                        trade.takeProfit ? formatPrice(trade.takeProfit, trade.symbol) : '-'
                      )}
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-yellow-500/80" title={trade.totalCharges ? `Spread: $${(trade.spreadCost || 0).toFixed(2)} | Commission: $${(trade.chargeAmount || 0).toFixed(2)}` : ''}>
                      {trade.totalCharges ? `-$${trade.totalCharges.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-3 py-1 text-right font-mono font-medium ${
                      (activeTab === 'history' ? (trade.realizedPnL || 0) : trade.floatingPnL) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {activeTab === 'history'
                        ? `${(trade.realizedPnL || 0) >= 0 ? "+" : ""}$${Math.abs(trade.realizedPnL || 0).toFixed(2)}`
                        : `${trade.floatingPnL >= 0 ? "+" : ""}$${Math.abs(trade.floatingPnL).toFixed(2)}`
                      }
                    </td>
                    <td className="px-3 py-1 text-center">
                      {activeTab === "positions" && (
                        <div className="flex items-center justify-center gap-1">
                          {editingTradeId === trade._id ? (
                            <>
                              <button
                                onClick={() => handleModifySLTP(trade._id)}
                                disabled={savingModify}
                                className="p-1 text-green-500 hover:text-green-400 transition-colors disabled:opacity-50"
                                title="Save SL/TP"
                              >
                                {savingModify ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditingSLTP(trade)}
                                className="p-1 text-muted-foreground hover:text-blue-500 transition-colors"
                                title="Modify SL/TP"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleCloseTrade(trade._id, trade.symbol)}
                                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Close trade"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bottom Bar - Wallet Info */}
      <div className="h-7 flex items-center justify-between px-3 border-t border-border bg-secondary/50 shrink-0 fixed bottom-14 left-0 right-0 z-10 lg:relative lg:bottom-auto">
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-muted-foreground">
            Balance: <span className="text-cyan-500 font-mono">{wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
          </span>
          <span className="text-muted-foreground">
            Equity: <span className="text-cyan-500 font-mono">{wallet?.equity?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
          </span>
          <span className="text-muted-foreground">
            Margin: <span className="text-yellow-500 font-mono">{wallet?.margin?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
          </span>
          <span className="text-muted-foreground">
            Free: <span className="text-cyan-500 font-mono">{wallet?.freeMargin?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
          </span>
          <span className="text-muted-foreground">
            Level: <span className="text-cyan-500 font-mono">{wallet?.marginLevel?.toFixed(2) || '0.00'}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

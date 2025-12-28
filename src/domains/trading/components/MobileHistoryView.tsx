"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2 } from "lucide-react";

interface Trade {
  _id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  closePrice?: number;
  realizedPnL?: number;
  closedAt?: string;
  status: string;
}

interface WalletData {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

export function MobileHistoryView() {
  const [activeTab, setActiveTab] = useState<"trades" | "fills" | "deals">("trades");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesRes, walletRes] = await Promise.all([
          fetch('/api/user/trades?status=closed', { credentials: 'include' }),
          fetch('/api/user/wallet', { credentials: 'include' }),
        ]);
        
        const tradesData = await tradesRes.json();
        const walletData = await walletRes.json();
        
        if (tradesData.success) {
          setTrades(tradesData.trades || []);
        }
        if (walletData.success) {
          setWallet(walletData.wallet);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalProfit = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {["trades", "fills", "deals"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              activeTab === tab 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="m-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit</span>
            <span className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
              {totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span>{wallet?.totalDeposits?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Withdrawal</span>
            <span>{wallet?.totalWithdrawals?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Swap</span>
            <span>0.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Commission</span>
            <span>0.00</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-blue-200 dark:border-blue-800">
            <span>Balance</span>
            <span>{wallet?.balance?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <Clock className="w-16 h-16 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">No History Available</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {trades.map((trade) => (
              <div key={trade._id} className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{trade.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {trade.side} {trade.lot} lots @ {trade.entryPrice}
                    </div>
                    {trade.closedAt && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(trade.closedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className={`text-right font-semibold ${(trade.realizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(trade.realizedPnL || 0) >= 0 ? '+' : ''}{(trade.realizedPnL || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

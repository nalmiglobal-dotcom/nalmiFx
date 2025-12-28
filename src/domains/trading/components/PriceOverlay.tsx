"use client";

import { useState, useEffect } from "react";

interface Trade {
  _id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  floatingPnL: number;
}

interface PriceLinesProps {
  bid: number;
  ask: number;
  symbol: string;
}

export function PriceLines({ bid, ask, symbol }: PriceLinesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/user/trades?status=open', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setTrades(data.trades?.filter((t: Trade) => t.symbol === symbol) || []);
        }
      } catch (e) {
        // Ignore
      }
    };
    
    fetchTrades();
    const interval = setInterval(fetchTrades, 3000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (!bid || !ask) return null;

  const formatPrice = (price: number): string => {
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (symbol.includes('XAU') || symbol.includes('XAG')) return price.toFixed(2);
    if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(2);
    if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('NAS') || symbol.includes('DE40')) return price.toFixed(1);
    return price.toFixed(5);
  };

  return (
    <>
      {/* Trade Entry Lines - Buy/Sell lines only */}
      {trades.map((trade, index) => {
        const isBuy = trade.side === 'BUY';
        const pnl = trade.floatingPnL || 0;
        const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400';
        
        return (
          <div 
            key={trade._id}
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${50 + index * 5}%` }}
          >
            {/* Horizontal line */}
            <div className={`absolute inset-x-0 border-t ${isBuy ? 'border-blue-500' : 'border-orange-500'}`} />
            
            {/* Trade info label on right */}
            <div className="absolute right-0 -translate-y-1/2 flex items-center">
              <div className={`${isBuy ? 'bg-blue-600' : 'bg-orange-600'} text-white text-[10px] font-medium px-2 py-0.5 flex items-center gap-2`}>
                <span>{isBuy ? 'Buy' : 'Sell'} {trade.lot.toFixed(2)} lots</span>
                <span className={pnlColor}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span>
              </div>
              <div className="bg-[#1a1a2e] text-white text-[11px] font-mono px-2 py-0.5 border-l border-gray-700">
                {formatPrice(trade.entryPrice)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

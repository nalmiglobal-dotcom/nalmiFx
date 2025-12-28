"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface Instrument {
  symbol: string;
  name: string;
  icon: string;
  bid: number;
  ask: number;
  spread: number;
  change24h?: number;
}

interface MobileMarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol: string;
}

export function MobileMarketsView({ onSelectSymbol, selectedSymbol }: MobileMarketsViewProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSheet, setActionSheet] = useState<{ symbol: string; name: string } | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/trading/prices');
      const data = await res.json();
      if (data.success && data.data) {
        setInstruments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatPrice = (price: number) => {
    if (price < 10) return price.toFixed(5);
    if (price < 1000) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatSpread = (spread: number, symbol: string) => {
    if (symbol.includes('JPY')) {
      return (spread * 100).toFixed(0);
    }
    if (spread < 0.01) {
      return (spread * 10000).toFixed(0);
    }
    return spread.toFixed(0);
  };

  const handleInstrumentClick = (inst: Instrument) => {
    setActionSheet({ symbol: inst.symbol, name: inst.name });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* One Click Toggle */}
        <div className="flex justify-end px-4 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground">One Click</span>
          <div className="ml-2 w-10 h-5 bg-muted rounded-full relative">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-background rounded-full shadow" />
          </div>
        </div>

        {/* Instruments List */}
        <div className="divide-y divide-border">
          {instruments.map((inst) => (
            <div
              key={inst.symbol}
              onClick={() => handleInstrumentClick(inst)}
              className={`px-4 py-3 flex items-center gap-3 active:bg-accent ${selectedSymbol === inst.symbol ? 'bg-accent/50' : ''}`}
            >
              {/* Time & Symbol */}
              <div className="w-20">
                <div className="text-[10px] text-muted-foreground">
                  {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="font-semibold text-sm">{inst.symbol}</div>
              </div>

              {/* Sell Price */}
              <div className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground">sell</div>
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-sm font-mono">{formatPrice(inst.bid)}</span>
                  <span className={`text-xs font-bold ${(inst.change24h || 0) < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {Math.abs(Math.floor((inst.change24h || 0) * 10) % 10)}
                  </span>
                </div>
                <div className="text-[9px] text-blue-500">low {formatPrice(inst.bid * 0.998)}</div>
              </div>

              {/* Spread */}
              <div className="w-14 text-center">
                <div className="text-[10px] text-muted-foreground">spread</div>
                <div className="text-sm font-semibold">{formatSpread(inst.spread, inst.symbol)}</div>
              </div>

              {/* Buy Price */}
              <div className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground">buy</div>
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-sm font-mono">{formatPrice(inst.ask)}</span>
                  <span className={`text-xs font-bold ${(inst.change24h || 0) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {Math.abs(Math.floor((inst.change24h || 0) * 10) % 10)}
                  </span>
                </div>
                <div className="text-[9px] text-muted-foreground">high {formatPrice(inst.ask * 1.002)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Sheet */}
      {actionSheet && (
        <div className="fixed inset-0 z-50" onClick={() => setActionSheet(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 text-center border-b border-border">
              <div className="font-bold text-lg">{actionSheet.symbol}</div>
            </div>
            <div className="divide-y divide-border">
              <button
                onClick={() => {
                  onSelectSymbol(actionSheet.symbol);
                  setActionSheet(null);
                }}
                className="w-full py-4 text-center text-blue-500 font-medium active:bg-accent"
              >
                New Order
              </button>
              <button
                onClick={() => setActionSheet(null)}
                className="w-full py-4 text-center text-blue-500 font-medium active:bg-accent"
              >
                Details
              </button>
              <button
                onClick={() => {
                  onSelectSymbol(actionSheet.symbol);
                  setActionSheet(null);
                }}
                className="w-full py-4 text-center text-blue-500 font-medium active:bg-accent"
              >
                Chart
              </button>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setActionSheet(null)}
                className="w-full py-3 bg-muted rounded-lg font-medium active:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

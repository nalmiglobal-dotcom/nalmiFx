"use client";

import { BarChart3 } from "lucide-react";

interface ChartToolbarProps {
  symbol: string;
  change: number;
  bid: number;
  ask: number;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onNewOrder: () => void;
}

const timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

export function ChartToolbar({ symbol, change, bid, ask, timeframe, onTimeframeChange, onNewOrder }: ChartToolbarProps) {
  const openIndicators = () => {
    const widget = (window as any).tvWidget;
    if (widget) {
      try {
        widget.activeChart().executeActionById('insertIndicator');
      } catch (e) {
        console.log('Indicators not available');
      }
    }
  };
  const formatPrice = (price: number) => {
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (symbol.includes('XAU') || symbol.includes('XAG')) return price.toFixed(2);
    if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(2);
    return price.toFixed(5);
  };

  return (
    <div className="h-11 bg-card border-b border-border flex items-center justify-between px-3">
      {/* Left - Symbol & Timeframe */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{symbol}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                timeframe === tf ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
          <button
            onClick={openIndicators}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Indicators"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Indicators</span>
          </button>
        </div>
      </div>

      {/* Right - Price & New Order */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">B:</span>
          <span className="text-red-500 font-mono">{formatPrice(bid)}</span>
          <span className="text-muted-foreground ml-2">A:</span>
          <span className="text-green-500 font-mono">{formatPrice(ask)}</span>
        </div>

        <button
          onClick={onNewOrder}
          className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded transition-colors"
        >
          Trade
        </button>
      </div>
    </div>
  );
}

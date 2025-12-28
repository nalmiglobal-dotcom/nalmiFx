"use client";

import { useState } from "react";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface MobileTradeViewProps {
  symbol: string;
  bid: number;
  ask: number;
  onTradeCreated: () => void;
}

export function MobileTradeView({ symbol, bid, ask, onTradeCreated }: MobileTradeViewProps) {
  const [volume, setVolume] = useState(0.01);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    if (price < 10) return price.toFixed(5);
    if (price < 1000) return price.toFixed(4);
    return price.toFixed(2);
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0.01, Math.round((volume + delta) * 100) / 100);
    setVolume(newVolume);
  };

  const adjustSL = (delta: number) => {
    setStopLoss(Math.max(0, stopLoss + delta));
  };

  const adjustTP = (delta: number) => {
    setTakeProfit(Math.max(0, takeProfit + delta));
  };

  const handleTrade = async (side: "BUY" | "SELL") => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol,
          side,
          lot: volume,
          stopLoss: stopLoss > 0 ? stopLoss : undefined,
          takeProfit: takeProfit > 0 ? takeProfit : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${side} order placed`);
        onTradeCreated();
      } else {
        toast.error(data.message || "Failed to place order");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Symbol & Order Type */}
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">{symbol}</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg">
          <span>{orderType === "market" ? "Market Order" : "Limit Order"}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="px-6 py-4">
        <div className="text-center text-sm text-muted-foreground mb-2">Volume</div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => adjustVolume(-0.01)}
            className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center active:bg-blue-200"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-2xl font-semibold min-w-[80px] text-center">{volume.toFixed(2)}</span>
          <button
            onClick={() => adjustVolume(0.01)}
            className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center active:bg-blue-200"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* SL/TP Controls */}
      <div className="px-6 py-4 flex gap-8">
        {/* Stop Loss */}
        <div className="flex-1">
          <div className="text-center text-sm text-muted-foreground mb-2">SL</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => adjustSL(-1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:bg-accent"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-semibold min-w-[60px] text-center">{stopLoss}</span>
            <button
              onClick={() => adjustSL(1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:bg-accent"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Take Profit */}
        <div className="flex-1">
          <div className="text-center text-sm text-muted-foreground mb-2">TP</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => adjustTP(-1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:bg-accent"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-semibold min-w-[60px] text-center">{takeProfit}</span>
            <button
              onClick={() => adjustTP(1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:bg-accent"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-6 my-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          Disclaimer! New Order is executed at Market Conditions, there can be a difference between your requested price and the execution price due to a change in actual Market prices.
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Buy/Sell Buttons */}
      <div className="flex gap-0">
        <button
          onClick={() => handleTrade("SELL")}
          disabled={loading || bid === 0}
          className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 active:bg-red-700"
        >
          <div className="text-xs text-white/80">Sell</div>
          <div className="text-lg font-bold">{formatPrice(bid)}</div>
        </button>
        <button
          onClick={() => handleTrade("BUY")}
          disabled={loading || ask === 0}
          className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 active:bg-green-700"
        >
          <div className="text-xs text-white/80">Buy</div>
          <div className="text-lg font-bold">{formatPrice(ask)}</div>
        </button>
      </div>
    </div>
  );
}

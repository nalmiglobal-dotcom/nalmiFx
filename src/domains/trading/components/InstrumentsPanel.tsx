"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Star } from "lucide-react";

interface Instrument {
  symbol: string;
  name: string;
  icon: string;
  bid: number;
  ask: number;
  spread: number;
  change24h?: number;
}

const categories = ["All", "Forex", "Crypto", "Commodities", "Indices", "Stocks"];

interface InstrumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol: string;
}

export function InstrumentsPanel({ isOpen, onClose, onSelectSymbol, selectedSymbol }: InstrumentsPanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>(["EURUSD", "XAUUSD", "BTCUSD"]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const category = activeCategory === "All" ? "" : activeCategory.toLowerCase();
      const url = `/api/trading/prices${category ? `?category=${category}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setInstruments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (isOpen) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchPrices]);

  const filteredInstruments = instruments.filter((inst) => {
    const matchesSearch = inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
      inst.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('JPY')) return price.toFixed(3);
    if (symbol.includes('XAU') || symbol.includes('XAG')) return price.toFixed(2);
    if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(2);
    if (symbol.includes('US30') || symbol.includes('US500') || symbol.includes('US100') || symbol.includes('NAS') || symbol.includes('DE40')) return price.toFixed(1);
    return price.toFixed(5);
  };


  const displayInstruments = activeCategory === "favorites" 
    ? instruments.filter((i) => favorites.includes(i.symbol))
    : filteredInstruments;

  if (!isOpen) return null;

  return (
    <div className="flex flex-col bg-card border-r border-border w-full lg:w-[320px] h-full shrink-0">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-border shrink-0">
        <h2 className="text-sm font-medium text-foreground">Instruments</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search instruments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-secondary border-none rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setActiveCategory("favorites")}
            className={`p-2 rounded shrink-0 ${activeCategory === "favorites" ? "bg-primary" : "bg-secondary hover:bg-accent"}`}
          >
            <Star className={`w-3.5 h-3.5 ${activeCategory === "favorites" ? "fill-primary-foreground text-primary-foreground" : "text-muted-foreground"}`} />
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                activeCategory === cat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : displayInstruments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No instruments found
          </div>
        ) : (
          <div className="py-1">
            {displayInstruments.map((inst) => (
              <div
                key={inst.symbol}
                onClick={() => onSelectSymbol(inst.symbol)}
                className={`flex items-center px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                  selectedSymbol === inst.symbol 
                    ? "bg-accent border-l-primary" 
                    : "border-l-transparent hover:bg-accent/50"
                }`}
              >
                {/* Icon & Symbol */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="text-base">{inst.icon}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{inst.symbol}</span>
                      <button onClick={(e) => toggleFavorite(inst.symbol, e)} className="opacity-60 hover:opacity-100">
                        <Star className={`w-3 h-3 ${favorites.includes(inst.symbol) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {inst.change24h !== undefined && (
                        <span className={inst.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                          {inst.change24h >= 0 ? "+" : ""}{inst.change24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bid Price */}
                <div className="flex-1 text-right pr-3">
                  <div className="text-sm font-mono text-red-400">{formatPrice(inst.bid, inst.symbol)}</div>
                  <div className="text-[10px] text-muted-foreground">Bid</div>
                </div>

                {/* Ask Price */}
                <div className="text-right min-w-[70px]">
                  <div className="text-sm font-mono text-green-400">{formatPrice(inst.ask, inst.symbol)}</div>
                  <div className="text-[10px] text-muted-foreground">Ask</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex justify-between shrink-0">
        <span>{displayInstruments.length} instruments</span>
        <span>SetupFX24 Live Data</span>
      </div>
    </div>
  );
}

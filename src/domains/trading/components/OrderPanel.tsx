"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, ChevronDown } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/shared/components/ui/collapsible";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { toast } from "sonner";
import { calculateMargin, getContractSize } from "@/domains/trading/services/calculations";

interface OrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  bid: number;
  ask: number;
  onTradeCreated?: () => void;
  challengeAccountId?: string;
}

export function OrderPanel({ isOpen, onClose, symbol, bid, ask, onTradeCreated, challengeAccountId }: OrderPanelProps) {
  const [orderType, setOrderType] = useState<"market" | "pending">("market");
  const [volume, setVolume] = useState("0.01");
  const [selectedSide, setSelectedSide] = useState<"buy" | "sell" | null>(null);
  const [showTP, setShowTP] = useState(false);
  const [showSL, setShowSL] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [pendingPrice, setPendingPrice] = useState("");
  const [pendingType, setPendingType] = useState<"buy_limit" | "sell_limit" | "buy_stop" | "sell_stop">("buy_limit");
  const [wallet, setWallet] = useState<{ equity: number; margin: number; freeMargin: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWalletInfo();
    }
  }, [isOpen]);

  const fetchWalletInfo = async () => {
    try {
      const res = await fetch('/api/user/wallet', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.wallet) {
        // Calculate total margin used by open trades
        const tradesRes = await fetch('/api/user/trades?status=open', {
          credentials: 'include',
        });
        const tradesData = await tradesRes.json();
        const totalMarginUsed = tradesData.success 
          ? tradesData.trades.reduce((sum: number, t: any) => sum + (t.margin || 0), 0)
          : 0;
        
        setWallet({
          equity: data.wallet.equity || 0,
          margin: totalMarginUsed,
          freeMargin: (data.wallet.equity || 0) - totalMarginUsed,
        });
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const adjustVolume = (delta: number) => {
    const current = parseFloat(volume) || 0;
    const newVal = Math.max(0.01, current + delta);
    setVolume(newVal.toFixed(2));
  };

  const formatPrice = (price: number) => {
    if (price < 10) return price.toFixed(5);
    if (price < 1000) return price.toFixed(3);
    return price.toFixed(2);
  };

  const calculateCurrentMargin = () => {
    const lot = parseFloat(volume) || 0;
    if (lot === 0 || !selectedSide) return 0;
    
    const entryPrice = selectedSide === 'buy' ? ask : bid;
    const contractSize = getContractSize(symbol);
    return calculateMargin(lot, entryPrice, contractSize);
  };

  const handleOpenOrder = async () => {
    if (!selectedSide) {
      toast.error('Please select Buy or Sell');
      return;
    }

    const lot = parseFloat(volume);
    if (!lot || lot < 0.01) {
      toast.error('Lot size must be at least 0.01');
      return;
    }

    const requiredMargin = calculateCurrentMargin();
    if (wallet && requiredMargin > wallet.freeMargin) {
      toast.error(`Insufficient margin. Required: $${requiredMargin.toFixed(2)}, Available: $${wallet.freeMargin.toFixed(2)}`);
      return;
    }

    setLoading(true);
    
    // Always read from localStorage to get the current challenge account ID
    const currentChallengeId = localStorage.getItem('activeChallengeAccountId');
    console.log('[OrderPanel] Using challenge account:', currentChallengeId);
    
    try {
      const res = await fetch('/api/user/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol,
          side: selectedSide.toUpperCase(),
          lot,
          stopLoss: slPrice ? parseFloat(slPrice) : undefined,
          takeProfit: tpPrice ? parseFloat(tpPrice) : undefined,
          challengeAccountId: currentChallengeId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Trade opened successfully');
        // Reset form
        setVolume('0.01');
        setSelectedSide(null);
        setTpPrice('');
        setSlPrice('');
        setShowTP(false);
        setShowSL(false);
        onTradeCreated?.();
        fetchWalletInfo();
        // Dispatch event to update chart
        window.dispatchEvent(new CustomEvent('tradeCreated'));
      } else {
        toast.error(data.message || 'Failed to open trade');
      }
    } catch (error) {
      console.error('Failed to open trade:', error);
      toast.error('Failed to open trade');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPendingOrder = async () => {
    const lot = parseFloat(volume);
    const price = parseFloat(pendingPrice);

    if (!price || price <= 0) {
      toast.error('Please enter a valid entry price');
      return;
    }

    if (!lot || lot < 0.01) {
      toast.error('Lot size must be at least 0.01');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/pending-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol,
          orderType: pendingType,
          lot,
          triggerPrice: price,
          stopLoss: slPrice ? parseFloat(slPrice) : undefined,
          takeProfit: tpPrice ? parseFloat(tpPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Pending order created: ${pendingType.replace('_', ' ').toUpperCase()}`);
        // Reset form
        setVolume('0.01');
        setPendingPrice('');
        setTpPrice('');
        setSlPrice('');
        setShowTP(false);
        setShowSL(false);
        onTradeCreated?.();
        fetchWalletInfo();
        // Dispatch event to update chart
        window.dispatchEvent(new CustomEvent('tradeCreated'));
      } else {
        toast.error(data.message || 'Failed to create pending order');
      }
    } catch (error) {
      console.error('Failed to create pending order:', error);
      toast.error('Failed to create pending order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentMargin = calculateCurrentMargin();
  const freeMargin = wallet ? wallet.freeMargin - currentMargin : 0;

  return (
    <>
      {/* Desktop overlay - only show on desktop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 hidden lg:block"
        onClick={onClose}
      />
      {/* Mobile: Full page | Desktop: Sidebar */}
      <div className={`
        lg:fixed lg:right-0 lg:top-[52px] lg:bottom-0 lg:z-50 lg:w-[280px] lg:border-l lg:border-border
        w-full h-full
        bg-card flex flex-col transition-transform duration-300 ease-out overflow-hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:hidden'}
      `}>
        <div className="flex items-center justify-between px-4 py-3 lg:px-3 lg:py-2.5 border-b border-border shrink-0 bg-card">
          <h2 className="text-base lg:text-sm font-semibold text-foreground">{symbol} order</h2>
          <button onClick={onClose} className="p-1.5 lg:p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
        </div>

        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "pending")} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <TabsList className="grid w-full grid-cols-2 bg-card border-b border-border rounded-none h-auto p-0 shrink-0">
            <TabsTrigger
              value="market"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs text-muted-foreground data-[state=active]:text-foreground"
            >
              Market
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs text-muted-foreground data-[state=active]:text-foreground"
            >
              Pending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden bg-card">
            <div className="flex-1 overflow-y-auto min-h-0 pb-1">
              <div className="p-4 lg:p-3 space-y-4 lg:space-y-3">
                <div className="bg-secondary rounded-lg p-3 lg:p-2">
                  <div className="flex items-center justify-between text-sm lg:text-xs text-muted-foreground">
                    <span>Regular settings</span>
                    <ChevronDown className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                  </div>
                </div>

                {/* Buy/Sell Buttons - Larger on mobile */}
                <div className="grid grid-cols-2 gap-3 lg:gap-2">
                  <button
                    onClick={() => setSelectedSide("sell")}
                    className={`p-4 lg:p-3 rounded-lg transition-colors ${selectedSide === "sell" ? "bg-red-600" : "bg-red-600/20 hover:bg-red-600/30"}`}
                  >
                    <div className="text-xs lg:text-[10px] text-foreground/70 mb-1 lg:mb-0.5">Sell</div>
                    <div className="text-xl lg:text-base font-bold text-foreground font-mono">{formatPrice(bid)}</div>
                  </button>
                  <button
                    onClick={() => setSelectedSide("buy")}
                    className={`p-4 lg:p-3 rounded-lg transition-colors ${selectedSide === "buy" ? "bg-green-600" : "bg-green-600/20 hover:bg-green-600/30"}`}
                  >
                    <div className="text-xs lg:text-[10px] text-foreground/70 mb-1 lg:mb-0.5">Buy</div>
                    <div className="text-xl lg:text-base font-bold text-foreground font-mono">{formatPrice(ask)}</div>
                  </button>
                </div>

                <div>
                  <label className="text-sm lg:text-xs text-muted-foreground mb-2 block">Volume</label>
                  <div className="flex items-center gap-3 lg:gap-2">
                    <button
                      onClick={() => adjustVolume(-0.01)}
                      className="w-12 h-12 lg:w-10 lg:h-10 flex items-center justify-center bg-secondary hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                    <Input
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      className="flex-1 bg-secondary border-none text-center font-mono h-12 lg:h-10 text-lg lg:text-sm text-foreground"
                    />
                    <button
                      onClick={() => adjustVolume(0.01)}
                      className="w-12 h-12 lg:w-10 lg:h-10 flex items-center justify-center bg-secondary hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                  </div>
                  <div className="flex justify-end text-xs lg:text-[10px] text-muted-foreground mt-1">
                    <span>{parseFloat(volume) || 0} lot</span>
                  </div>
                </div>

                <Collapsible open={showTP} onOpenChange={setShowTP}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 lg:p-2.5 bg-secondary rounded-lg text-sm lg:text-xs text-green-500 hover:bg-accent transition-colors">
                    <span>Take profit</span>
                    <Plus className={`w-4 h-4 lg:w-3.5 lg:h-3.5 transition-transform ${showTP ? "rotate-45" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Take profit price"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      className="bg-secondary border-none font-mono h-12 lg:h-10 text-base lg:text-sm text-foreground"
                      type="number"
                      step="any"
                    />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={showSL} onOpenChange={setShowSL}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 lg:p-2.5 bg-secondary rounded-lg text-sm lg:text-xs text-red-500 hover:bg-accent transition-colors">
                    <span>Stop loss</span>
                    <Plus className={`w-4 h-4 lg:w-3.5 lg:h-3.5 transition-transform ${showSL ? "rotate-45" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Stop loss price"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      className="bg-secondary border-none font-mono h-12 lg:h-10 text-base lg:text-sm text-foreground"
                      type="number"
                      step="any"
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Margin Info & Open Order Button - Inside scrollable area */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm lg:text-xs mb-3">
                    <span className="text-muted-foreground">Margin / Free</span>
                    <span className={`font-medium ${freeMargin < 0 ? 'text-red-500' : 'text-foreground'}`}>
                      ${currentMargin.toFixed(2)} / ${wallet?.freeMargin.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <button 
                    onClick={handleOpenOrder}
                    disabled={loading || !selectedSide}
                    className={`w-full h-14 lg:h-12 rounded-lg font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSide === 'sell' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      selectedSide === 'buy' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {loading ? 'Opening...' : 'Open order'}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="flex-1 flex flex-col m-0 bg-card min-h-0 overflow-hidden">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-1">
              <div className="p-4 lg:p-3 space-y-4 lg:space-y-3">
                <div>
                  <label className="text-sm lg:text-xs text-muted-foreground mb-1.5 block">Order type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["buy_limit", "sell_limit", "buy_stop", "sell_stop"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPendingType(type)}
                        className={`p-3 lg:p-2 rounded-lg text-xs font-medium transition-colors ${pendingType === type
                          ? type.includes("buy") ? "bg-green-500/20 text-green-500 border border-green-500" : "bg-red-500/20 text-red-500 border border-red-500"
                          : "bg-secondary hover:bg-accent border border-transparent"
                        }`}
                      >
                        {type.replace("_", " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm lg:text-xs text-muted-foreground mb-1.5 block">Entry price</label>
                  <Input
                    placeholder="Enter price"
                    value={pendingPrice}
                    onChange={(e) => setPendingPrice(e.target.value)}
                    className="bg-secondary border-none font-mono h-12 lg:h-10 text-base lg:text-sm"
                    type="number"
                    step="any"
                  />
                </div>

                <div>
                  <label className="text-sm lg:text-xs text-muted-foreground mb-1.5 block">Order volume</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      className="flex-1 bg-secondary border-none text-center font-mono h-12 lg:h-10 text-base lg:text-sm"
                    />
                    <button
                      onClick={() => adjustVolume(-0.01)}
                      className="p-2 bg-secondary hover:bg-accent rounded-lg h-12 lg:h-10 w-12 lg:w-10 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    </button>
                    <button
                      onClick={() => adjustVolume(0.01)}
                      className="p-2 bg-secondary hover:bg-accent rounded-lg h-12 lg:h-10 w-12 lg:w-10 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    </button>
                  </div>
                </div>

                <Collapsible open={showTP} onOpenChange={setShowTP}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 lg:p-2.5 bg-secondary rounded-lg text-sm lg:text-xs text-green-500 hover:bg-accent transition-colors">
                    <span>Take profit</span>
                    <Plus className={`w-4 h-4 lg:w-3.5 lg:h-3.5 transition-transform ${showTP ? "rotate-45" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Take profit price"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      className="bg-secondary border-none font-mono h-12 lg:h-10 text-base lg:text-sm"
                      type="number"
                      step="any"
                    />
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={showSL} onOpenChange={setShowSL}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 lg:p-2.5 bg-secondary rounded-lg text-sm lg:text-xs text-red-500 hover:bg-accent transition-colors">
                    <span>Stop loss</span>
                    <Plus className={`w-4 h-4 lg:w-3.5 lg:h-3.5 transition-transform ${showSL ? "rotate-45" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Stop loss price"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      className="bg-secondary border-none font-mono h-12 lg:h-10 text-base lg:text-sm"
                      type="number"
                      step="any"
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Margin Info & Place Order Button - Inside scrollable area like market section */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm lg:text-xs mb-3">
                    <span className="text-muted-foreground">Margin / Free</span>
                    <span className="font-medium text-foreground">
                      ${currentMargin.toFixed(2)} / ${wallet?.freeMargin.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <button 
                    onClick={handleOpenPendingOrder}
                    disabled={loading || !pendingPrice}
                    className={`w-full h-14 lg:h-12 rounded-lg font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      pendingType.includes('buy') 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {loading ? 'Creating...' : `Place ${pendingType.replace('_', ' ').toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { InstrumentsPanel } from "@/domains/trading/components/InstrumentsPanel";
import { OrderPanel } from "@/domains/trading/components/OrderPanel";
import { OrdersTable } from "@/domains/trading/components/OrdersTable";
import { ChartToolbar } from "@/domains/trading/components/ChartToolbar";
import { TradingViewChart } from "@/domains/trading/components/TradingViewChart";
import { PriceLines } from "@/domains/trading/components/PriceOverlay";
import { MobileTopBar } from "@/domains/trading/components/MobileTopBar";
import { MobileBottomNav, MobileTab } from "@/domains/trading/components/MobileBottomNav";
import { useState, useCallback } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { GlobalConfirmationDialogProvider } from "@/shared/components/ui/global-confirmation-dialog";

const symbolMap: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  BTCUSD: "BITSTAMP:BTCUSD",
  EURUSD: "FX:EURUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
  USDJPY: "FX:USDJPY",
  GBPUSD: "FX:GBPUSD",
  NAS100: "PEPPERSTONE:NAS100",
  US30: "PEPPERSTONE:US30",
  US100: "PEPPERSTONE:NAS100",
  US500: "PEPPERSTONE:US500",
  GBPJPY: "FX:GBPJPY",
  XTIUSD: "TVC:USOIL",
  AUDUSD: "FX:AUDUSD",
  XAGUSD: "OANDA:XAGUSD",
  SOLUSD: "COINBASE:SOLUSD",
  NZDUSD: "FX:NZDUSD",
  USDCAD: "FX:USDCAD",
  USDCHF: "FX:USDCHF",
  EURJPY: "FX:EURJPY",
  EURGBP: "FX:EURGBP",
  LTCUSD: "COINBASE:LTCUSD",
  XRPUSD: "BITSTAMP:XRPUSD",
  DOGEUSD: "BINANCE:DOGEUSDT",
  XBRUSD: "TVC:UKOIL",
  DE40: "PEPPERSTONE:GER40",
};

export default function ChartPage() {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M1");
  const [showInstruments, setShowInstruments] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("charts");
  const [priceData, setPriceData] = useState<{ bid: number; ask: number; change24h: number }>({ bid: 0, ask: 0, change24h: 0 });
  const [quickLot, setQuickLot] = useState("0.01");
  const [isQuickTrading, setIsQuickTrading] = useState(false);
  const [activeChallengeAccountId, setActiveChallengeAccountId] = useState<string | null>(null);

  // Listen for challenge account changes from Header
  useEffect(() => {
    // Check localStorage on mount
    const storedId = localStorage.getItem('activeChallengeAccountId');
    if (storedId) setActiveChallengeAccountId(storedId);

    const handleChallengeChange = (e: CustomEvent) => {
      if (e.detail) {
        setActiveChallengeAccountId(e.detail._id);
      } else {
        setActiveChallengeAccountId(null);
      }
    };

    window.addEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
    return () => window.removeEventListener('challengeAccountChanged', handleChallengeChange as EventListener);
  }, []);

  const handleQuickTrade = async (side: 'BUY' | 'SELL') => {
    if (isQuickTrading) return;
    setIsQuickTrading(true);
    
    // Always read from localStorage to get the current challenge account ID
    const currentChallengeId = localStorage.getItem('activeChallengeAccountId');
    console.log('[QuickTrade] Using challenge account:', currentChallengeId);
    
    try {
      const res = await fetch('/api/user/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side,
          lot: parseFloat(quickLot) || 0.01,
          challengeAccountId: currentChallengeId || undefined,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`${side} ${quickLot} ${selectedSymbol} @ ${data.executionPrice?.toFixed(2)}`);
        window.dispatchEvent(new Event('tradeCreated'));
      } else {
        toast.error(data.message || 'Trade failed');
      }
    } catch (e) {
      toast.error('Failed to execute trade');
    } finally {
      setIsQuickTrading(false);
    }
  };

  const adjustLot = (delta: number) => {
    const current = parseFloat(quickLot) || 0.01;
    const newLot = Math.max(0.01, Math.round((current + delta) * 100) / 100);
    setQuickLot(newLot.toFixed(2));
  };

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(selectedSymbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPriceData({
            bid: data.data.bid,
            ask: data.data.ask,
            change24h: data.data.change24h || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch price:', e);
      }
    };

    fetchPrice();
    // Fetch price every 300ms for real-time updates
    const interval = setInterval(fetchPrice, 300);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleSelectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setMobileTab("charts");
  }, []);

  return (
    <GlobalConfirmationDialogProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="lg:hidden">
        <MobileTopBar onPlus={() => setShowOrderPanel(true)} />
      </div>

      <div className="hidden lg:block">
        <Header />
      </div>

      <div className="flex-1 flex overflow-hidden pb-14 lg:pb-0">
        <div className="hidden lg:block">
          <Sidebar 
            onOpenInstruments={() => setShowInstruments(true)} 
            onCloseInstruments={() => setShowInstruments(false)}
            showInstruments={showInstruments}
          />
        </div>

        {mobileTab === "markets" && (
          <div className="lg:hidden flex-1 overflow-hidden">
            <InstrumentsPanel
              isOpen={true}
              onClose={() => setMobileTab("charts")}
              onSelectSymbol={handleSelectSymbol}
              selectedSymbol={selectedSymbol}
            />
          </div>
        )}

        {mobileTab === "trade" && (
          <div className="lg:hidden flex-1 overflow-hidden">
            <OrderPanel
              isOpen={true}
              onClose={() => setMobileTab("charts")}
              symbol={selectedSymbol}
              bid={priceData.bid}
              ask={priceData.ask}
              onTradeCreated={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('tradeCreated'));
                }
                setMobileTab("history");
              }}
            />
          </div>
        )}

        {mobileTab === "history" && (
          <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
            <OrdersTable
              isExpanded={true}
              onToggle={() => {}}
              fullHeight={true}
            />
          </div>
        )}

        {mobileTab === "charts" && (
          <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
            <ChartToolbar
              symbol={selectedSymbol}
              change={priceData.change24h}
              bid={priceData.bid}
              ask={priceData.ask}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onNewOrder={() => setMobileTab("trade")}
            />
            <div className="flex-1 relative min-h-0 overflow-hidden">
              <TradingViewChart symbol={symbolMap[selectedSymbol] || selectedSymbol} interval={timeframe} />
              <PriceLines bid={priceData.bid} ask={priceData.ask} symbol={selectedSymbol} />
              
              {/* Quick Trade Panel - Mobile */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-border">
                <button
                  onClick={() => handleQuickTrade('BUY')}
                  disabled={isQuickTrading}
                  className="px-4 py-1.5 bg-[#2962ff] hover:bg-[#1e4bd8] text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                >
                  BUY
                </button>
                <div className="flex items-center bg-background rounded border border-border">
                  <button onClick={() => adjustLot(-0.01)} className="px-2 py-1.5 text-muted-foreground hover:text-foreground">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={quickLot}
                    onChange={(e) => setQuickLot(e.target.value)}
                    className="w-12 text-center text-sm bg-transparent border-none outline-none"
                  />
                  <button onClick={() => adjustLot(0.01)} className="px-2 py-1.5 text-muted-foreground hover:text-foreground">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => handleQuickTrade('SELL')}
                  disabled={isQuickTrading}
                  className="px-4 py-1.5 bg-[#ff5252] hover:bg-[#e04545] text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                >
                  SELL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Layout - Chart + Optional Instruments Panel */}
        <div className="hidden lg:flex flex-1 overflow-hidden min-w-0">
          {showInstruments && (
            <InstrumentsPanel
              isOpen={showInstruments}
              onClose={() => setShowInstruments(false)}
              onSelectSymbol={handleSelectSymbol}
              selectedSymbol={selectedSymbol}
            />
          )}

          <div className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300 ${showOrderPanel ? 'mr-70' : ''}`}>
            <ChartToolbar
              symbol={selectedSymbol}
              change={priceData.change24h}
              bid={priceData.bid}
              ask={priceData.ask}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onNewOrder={() => setShowOrderPanel(true)}
            />

            <div className="flex-1 relative min-h-0">
              <TradingViewChart symbol={symbolMap[selectedSymbol] || selectedSymbol} interval={timeframe} />
              <PriceLines bid={priceData.bid} ask={priceData.ask} symbol={selectedSymbol} />
              
              {/* Quick Trade Panel - Desktop */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-border">
                <button
                  onClick={() => handleQuickTrade('BUY')}
                  disabled={isQuickTrading}
                  className="px-5 py-2 bg-[#2962ff] hover:bg-[#1e4bd8] text-white font-semibold rounded transition-colors disabled:opacity-50"
                >
                  BUY
                </button>
                <div className="flex items-center bg-background rounded border border-border">
                  <button onClick={() => adjustLot(-0.01)} className="px-2.5 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={quickLot}
                    onChange={(e) => setQuickLot(e.target.value)}
                    className="w-14 text-center bg-transparent border-none outline-none font-medium"
                  />
                  <button onClick={() => adjustLot(0.01)} className="px-2.5 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleQuickTrade('SELL')}
                  disabled={isQuickTrading}
                  className="px-5 py-2 bg-[#ff5252] hover:bg-[#e04545] text-white font-semibold rounded transition-colors disabled:opacity-50"
                >
                  SELL
                </button>
              </div>
            </div>

            <OrdersTable
              isExpanded={ordersExpanded}
              onToggle={() => setOrdersExpanded(!ordersExpanded)}
            />
          </div>

          <OrderPanel
            isOpen={showOrderPanel}
            onClose={() => setShowOrderPanel(false)}
            symbol={selectedSymbol}
            bid={priceData.bid}
            ask={priceData.ask}
            challengeAccountId={activeChallengeAccountId || undefined}
            onTradeCreated={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('tradeCreated'));
              }
            }}
          />
        </div>
      </div>

      <MobileBottomNav active={mobileTab} onSelect={setMobileTab} />
      </div>
    </GlobalConfirmationDialogProvider>
  );
}


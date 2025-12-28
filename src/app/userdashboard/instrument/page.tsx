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

export default function InstrumentPage() {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M1");
  const [showInstruments, setShowInstruments] = useState(true);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("charts");
  const [priceData, setPriceData] = useState<{ bid: number; ask: number; change24h: number }>({ bid: 0, ask: 0, change24h: 0 });

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
    const interval = setInterval(fetchPrice, 1000);
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
          <Sidebar onOpenInstruments={() => setShowInstruments(true)} />
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
          <div className="lg:hidden flex-1 overflow-hidden">
            <OrdersTable
              isExpanded={true}
              onToggle={() => {}}
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
            </div>
            <OrdersTable
              isExpanded={ordersExpanded}
              onToggle={() => setOrdersExpanded(!ordersExpanded)}
            />
          </div>
        )}

        {/* Desktop Layout - Chart + Instruments Panel */}
        <div className="hidden lg:flex flex-1 overflow-hidden min-w-0">
          <InstrumentsPanel
            isOpen={showInstruments}
            onClose={() => setShowInstruments(false)}
            onSelectSymbol={handleSelectSymbol}
            selectedSymbol={selectedSymbol}
          />

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

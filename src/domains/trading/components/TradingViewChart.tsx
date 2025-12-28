"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface TradingViewChartProps {
  symbol: string;
  interval: string;
}

export function TradingViewChart({ symbol, interval }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Convert timeframe format (M1, M5, H1, etc.) to TradingView interval format
  const getTradingViewInterval = (timeframe: string): string => {
    const intervalMap: Record<string, string> = {
      "M1": "1",
      "M5": "5",
      "M15": "15",
      "M30": "30",
      "H1": "60",
      "H4": "240",
      "D1": "D",
      "W1": "W",
      "MN": "M"
    };
    return intervalMap[timeframe] || "1";
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Add CSS to hide TradingView logo (only once)
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    
    const styleId = "tradingview-hide-logo";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .tradingview-widget-container a[href*="tradingview.com"],
        .tradingview-widget-container [class*="tradingview-logo"],
        .tradingview-widget-container [class*="tradingview-widget-copyright"],
        .tradingview-widget-container iframe[src*="tradingview.com"] [class*="logo"],
        .tradingview-widget-container__widget [href*="tradingview.com"],
        div[id*="tradingview"] a[href*="tradingview.com"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || typeof document === 'undefined' || typeof window === 'undefined') return;

    const container = containerRef.current;
    
    // Clear previous content
    container.innerHTML = "";

    // Determine theme colors - TradingView requires hex colors, not RGBA
    const isDark = theme === "dark";
    const chartTheme = isDark ? "dark" : "light";
    const backgroundColor = isDark ? "#0a0a0f" : "#ffffff";
    const gridColor = isDark ? "#2a2a3a" : "#e2e8f0";

    // Create the widget container div
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.width = "100%";
    widgetContainer.style.height = "100%";
    container.appendChild(widgetContainer);

    // Create script element
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    
    // Set widget configuration as script content (this is the correct TradingView pattern)
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: getTradingViewInterval(interval),
      timezone: "Etc/UTC",
      theme: chartTheme,
      style: "1",
      locale: "en",
      backgroundColor: backgroundColor,
      gridColor: gridColor,
      hide_top_toolbar: true,
      hide_legend: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      hide_side_toolbar: true,
      support_host: "https://www.tradingview.com",
    });

    // Append script to widget container
    widgetContainer.appendChild(script);

    return () => {
      // Cleanup on unmount or prop change
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, interval, theme, mounted]);

  if (!mounted) {
    return (
      <div 
        className="tradingview-widget-container h-full w-full relative z-10 min-h-0 overflow-hidden" 
        style={{ 
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0f',
          position: 'relative'
        }}
      />
    );
  }

  const isDark = theme === "dark";
  const backgroundColor = isDark ? "#0a0a0f" : "#ffffff";

  return (
    <div 
      className="tradingview-widget-container h-full w-full relative z-10 min-h-0 overflow-hidden" 
      ref={containerRef}
      style={{ 
        width: '100%',
        height: '100%',
        backgroundColor: backgroundColor,
        position: 'relative'
      }}
    />
  );
}

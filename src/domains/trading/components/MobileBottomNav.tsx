"use client";

import { ArrowUpDown, LineChart, TrendingUp, Clock } from "lucide-react";

export type MobileTab = "markets" | "charts" | "trade" | "history";

interface MobileBottomNavProps {
  active: MobileTab;
  onSelect: (tab: MobileTab) => void;
}

export function MobileBottomNav({ active, onSelect }: MobileBottomNavProps) {
  const items: Array<{
    id: MobileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "markets", label: "Markets", icon: ArrowUpDown },
    { id: "charts", label: "Charts", icon: LineChart },
    { id: "trade", label: "Trade", icon: TrendingUp },
    { id: "history", label: "History", icon: Clock },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden safe-area-pb">
      <nav className="grid grid-cols-4 h-14">
        {items.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}



"use client";

import { useEffect, useState } from "react";
import { Home, Wallet } from "lucide-react";
import Link from "next/link";

interface WalletData {
  equity: number;
}

interface MobileTopBarProps {
  onPlus: () => void;
}

export function MobileTopBar({ onPlus }: MobileTopBarProps) {
  const [equity, setEquity] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchWallet = async () => {
      try {
        const res = await fetch("/api/user/wallet", { credentials: "include" });
        const data = await res.json();
        if (mounted && data?.success && data?.wallet) {
          setEquity(Number(data.wallet.equity || 0));
        }
      } catch {
        // ignore
      }
    };
    fetchWallet();
    const id = setInterval(fetchWallet, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border">
      <div className="h-12 px-3 flex items-center justify-between">
        {/* Home Button */}
        <Link
          href="/home"
          className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          aria-label="Go to Home"
        >
          <Home className="h-5 w-5" />
        </Link>

        <div className="text-center">
          <div className="text-[11px] text-muted-foreground leading-none">Equity</div>
          <div className="text-base font-semibold tabular-nums text-foreground">
            {equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Wallet Button */}
        <Link
          href="/wallet"
          className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent text-primary hover:text-primary/80"
          aria-label="Go to Wallet"
        >
          <Wallet className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}



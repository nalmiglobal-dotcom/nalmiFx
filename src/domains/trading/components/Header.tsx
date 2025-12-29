"use client";

import { Button } from "@/shared/components/ui/button";
import { Moon, Sun, LogOut, ChevronDown, Wallet, CreditCard, Trophy, UserPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface WalletData {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingProfit: number;
}

interface AccountData {
  _id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'trading' | 'challenge';
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingProfit: number;
}

interface ChallengeAccountData {
  _id: string;
  accountNumber: string;
  challengeType: string;
  accountSize: number;
  currentBalance: number;
  initialBalance: number;
  currentPhase: number;
  totalPhases: number;
  totalProfitPercent: number;
  status: 'evaluation' | 'funded' | 'breached' | 'expired';
  phaseProgress?: {
    phase: number;
    name: string;
    profitTarget: number;
    profitPercent: number;
    status: string;
  }[];
}

interface UserData {
  name: string;
  userId: number;
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [activeAccountType, setActiveAccountType] = useState<'wallet' | 'trading' | 'challenge'>('wallet');
  const [challengeAccounts, setChallengeAccounts] = useState<ChallengeAccountData[]>([]);
  const [activeChallengeAccount, setActiveChallengeAccount] = useState<ChallengeAccountData | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Clear any stale challenge account selection on initial load
    // This ensures wallet is the default on login
    localStorage.removeItem('activeChallengeAccountId');
    window.dispatchEvent(new CustomEvent('challengeAccountChanged', { detail: null }));
    
    fetchUserData();
    fetchWallet();
    fetchAccounts();
    fetchChallengeAccounts();
    
    // Check SL/TP and Pending Orders every 10 seconds (reduced from 5s for performance)
    const slTpInterval = setInterval(async () => {
      try {
        // Check SL/TP for open trades
        const slTpRes = await fetch('/api/user/trades/check-sl-tp', {
          method: 'POST',
          credentials: 'include',
        });
        const slTpData = await slTpRes.json();
        if (slTpData.success && slTpData.closedTrades?.length > 0) {
          slTpData.closedTrades.forEach((trade: any) => {
            const pnlText = trade.realizedPnL >= 0 ? `+$${trade.realizedPnL.toFixed(2)}` : `-$${Math.abs(trade.realizedPnL).toFixed(2)}`;
            if (trade.reason === 'TP') {
              toast.success(`🎯 Take Profit Hit! ${trade.symbol} closed at ${trade.closePrice.toFixed(5)} | P&L: ${pnlText}`, { duration: 5000 });
            } else if (trade.reason === 'SL') {
              toast.error(`🛑 Stop Loss Hit! ${trade.symbol} closed at ${trade.closePrice.toFixed(5)} | P&L: ${pnlText}`, { duration: 5000 });
            } else if (trade.reason === 'BALANCE_ZERO') {
              toast.error(`⚠️ Auto Squared Off! ${trade.symbol} - Insufficient balance | P&L: ${pnlText}`, { duration: 8000 });
            } else {
              toast.info(`${trade.symbol} closed by ${trade.reason}: ${pnlText}`, { duration: 5000 });
            }
          });
          window.dispatchEvent(new CustomEvent('tradeClosed'));
          window.dispatchEvent(new CustomEvent('tradeCreated'));
        }
        
        // Check pending orders execution
        const pendingRes = await fetch('/api/user/pending-orders/check-execution', {
          method: 'POST',
          credentials: 'include',
        });
        const pendingData = await pendingRes.json();
        if (pendingData.success && pendingData.executedOrders?.length > 0) {
          pendingData.executedOrders.forEach((order: any) => {
            const orderType = order.orderType.replace('_', ' ').toUpperCase();
            const isBuy = order.orderType.includes('buy');
            toast.success(
              `📋 Pending Order Executed! ${orderType} ${order.lot} lot ${order.symbol} @ ${order.executionPrice?.toFixed(5) || order.triggerPrice?.toFixed(5)}`,
              { 
                duration: 5000,
                style: { borderLeft: isBuy ? '4px solid #22c55e' : '4px solid #ef4444' }
              }
            );
          });
          window.dispatchEvent(new CustomEvent('pendingOrderExecuted'));
          window.dispatchEvent(new CustomEvent('tradeCreated'));
        }
      } catch (error) {
        // Silently handle error
      }
    }, 10000);
    
    // Refresh wallet every 5 seconds for live equity updates
    const walletInterval = setInterval(fetchWallet, 5000);
    
    return () => {
      clearInterval(walletInterval);
      clearInterval(slTpInterval);
    };
  }, []);

  useEffect(() => {
    // Get active account based on selected type and ID
    if (activeAccountType === 'wallet') {
      setActiveAccount(null);
    } else if (activeAccountId) {
      const account = accounts.find(a => a.accountType === activeAccountType && a._id === activeAccountId);
      setActiveAccount(account || null);
    } else {
      // Default to first account of selected type
      const account = accounts.find(a => a.accountType === activeAccountType);
      setActiveAccount(account || null);
      if (account) {
        setActiveAccountId(account._id);
      }
    }
  }, [accounts, activeAccountType, activeAccountId]);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      // Silently handle error - user will be redirected by middleware if not authenticated
    }
  };

  const fetchWallet = async () => {
    try {
      const response = await fetch("/api/user/wallet", {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/user/accounts", {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const fetchChallengeAccounts = async () => {
    try {
      const response = await fetch("/api/user/challenges/purchase", {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.challenges) {
        setChallengeAccounts(data.challenges);
        // Set first evaluation or funded challenge as default
        const activeChallenge = data.challenges.find((c: ChallengeAccountData) => 
          c.status === 'evaluation' || c.status === 'funded'
        );
        if (activeChallenge) {
          setActiveChallengeAccount(activeChallenge);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Logged out successfully");
        window.location.href = "/login";
      } else {
        toast.error(data.message || "Failed to logout");
      }
    } catch (error) {
      toast.error("An error occurred during logout");
      window.location.href = "/login";
    }
  };

  // Prevent hydration mismatch by ensuring we have data before rendering
  if (!mounted) {
    return (
      <header className="h-12 lg:h-14 bg-card border-b border-border flex items-center justify-between px-2 lg:px-4">
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="flex items-center gap-1 lg:gap-2">
            <span className="text-primary font-bold text-base lg:text-xl">NalmiFX</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </header>
    );
  }

  // Get display data based on account type
  const getDisplayData = () => {
    if (activeAccountType === 'wallet') return wallet;
    if (activeAccountType === 'challenge' && activeChallengeAccount) {
      return {
        balance: activeChallengeAccount.currentBalance || activeChallengeAccount.accountSize,
        equity: activeChallengeAccount.currentBalance || activeChallengeAccount.accountSize,
        margin: 0,
        freeMargin: activeChallengeAccount.currentBalance || activeChallengeAccount.accountSize,
        marginLevel: 0,
        floatingProfit: 0,
      };
    }
    return activeAccount || wallet;
  };
  
  const displayData = getDisplayData();
  const accountName = activeAccountType === 'wallet'
    ? 'Wallet'
    : activeAccountType === 'challenge'
      ? activeChallengeAccount 
        ? `Challenge #${activeChallengeAccount.accountNumber}`
        : 'Select Challenge'
      : activeAccount 
        ? `${(activeAccount as any).accountTypeName || (activeAccount as any).accountType} #${activeAccount.accountNumber}`
        : 'Select Account';

  if (loading || !displayData || !user) {
    return (
      <header className="h-12 lg:h-14 bg-card border-b border-border flex items-center justify-between px-2 lg:px-4">
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="flex items-center gap-1 lg:gap-2">
            <span className="text-primary font-bold text-base lg:text-xl">NalmiFX</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </header>
    );
  }

  const marginLevelDisplay = displayData.marginLevel > 0 
    ? `${displayData.marginLevel.toFixed(2)}%` 
    : "0.00%";

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-3 lg:px-4">
      {/* Logo */}
      <div className="flex items-center">
        <span className="text-primary font-bold text-lg lg:text-xl">NalmiFX</span>
      </div>

      {/* Desktop Stats */}
      <div className="hidden lg:flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground text-xs">Margin</div>
          <div className="font-semibold font-mono">${displayData.margin.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-xs">Free margin</div>
          <div className="font-semibold font-mono">${displayData.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-xs">Margin level</div>
          <div className="font-semibold">{marginLevelDisplay}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-xs">Equity</div>
          <div className="font-semibold font-mono">${displayData.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`h-9 px-3 text-sm ${activeAccountType === 'challenge' ? 'border-amber-500 bg-amber-500/10' : ''}`}>
              <Wallet className="w-4 h-4 mr-1 md:mr-2" />
              <span className="font-semibold">
                ${displayData.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => {
                  setActiveAccountType('wallet');
                  setActiveAccountId(null);
                  // Clear challenge account from localStorage
                  localStorage.removeItem('activeChallengeAccountId');
                  window.dispatchEvent(new CustomEvent('challengeAccountChanged', { detail: null }));
                }}
                className={activeAccountType === 'wallet' ? 'bg-accent' : ''}
              >
                <Wallet className="w-4 h-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">Wallet</div>
                  <div className="text-xs text-muted-foreground">${wallet?.balance.toFixed(2) || '0.00'}</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Trading Accounts</DropdownMenuLabel>
              
              {accounts.filter(a => (a as any).accountType === 'trading').map((account) => (
                <DropdownMenuItem
                  key={account._id}
                  onClick={() => {
                    setActiveAccountType('trading');
                    setActiveAccountId(account._id);
                  }}
                  className={activeAccountType === 'trading' && activeAccountId === account._id ? 'bg-accent' : ''}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {(account as any).accountTypeName || 'Trading'} #{account.accountNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">${account.balance.toFixed(2)}</div>
                  </div>
                </DropdownMenuItem>
              ))}

              {challengeAccounts.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Challenge Accounts</DropdownMenuLabel>
                  {challengeAccounts.filter(c => c.status === 'evaluation' || c.status === 'funded').map((challenge) => (
                    <DropdownMenuItem
                      key={challenge._id}
                      onClick={() => {
                        setActiveAccountType('challenge');
                        setActiveChallengeAccount(challenge);
                        // Store in localStorage for other components
                        console.log('[Header] Setting challenge account in localStorage:', challenge._id);
                        localStorage.setItem('activeChallengeAccountId', challenge._id);
                        console.log('[Header] localStorage now has:', localStorage.getItem('activeChallengeAccountId'));
                        window.dispatchEvent(new CustomEvent('challengeAccountChanged', { detail: challenge }));
                      }}
                      className={activeAccountType === 'challenge' && activeChallengeAccount?._id === challenge._id ? 'bg-accent' : ''}
                    >
                      <Trophy className="w-4 h-4 mr-2 text-amber-500" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {challenge.challengeType === 'one_step' ? 'One Step' : challenge.challengeType === 'two_step' ? 'Two Step' : 'Instant'} #{challenge.accountNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${(challenge.currentBalance || challenge.accountSize).toLocaleString()} 
                          <span className={challenge.status === 'funded' ? 'text-green-500 ml-1' : 'text-amber-500 ml-1'}>
                            {challenge.status === 'funded' ? 'Funded' : `Phase ${challenge.currentPhase}/${challenge.totalPhases}`}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/buy-challenge'}>
                <Trophy className="w-4 h-4 mr-2 text-amber-500" />
                Buy Challenge
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/challenge-dashboard'}>
                <Trophy className="w-4 h-4 mr-2" />
                Challenge Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-primary-foreground h-8 px-2 lg:px-4 text-xs lg:text-sm hidden md:flex"
            onClick={() => window.location.href = "/deposit"}
          >
            Top up
          </Button>
          
          {/* Mobile IB Button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="md:hidden bg-primary/10 border-primary text-primary hover:bg-primary hover:text-primary-foreground h-8 w-8"
            onClick={() => window.location.href = "/become-ib"}
            title="Become IB"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
    </header>
  );
}

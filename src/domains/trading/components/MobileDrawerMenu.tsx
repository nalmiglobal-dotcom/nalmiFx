"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Wallet,
  History,
  Settings,
  User,
  LogOut,
  Lock,
  BarChart3,
  HelpCircle,
  Globe,
} from "lucide-react";

interface MobileDrawerMenuProps {
  onNavigate?: () => void;
}

interface UserData {
  name: string;
  email: string;
  userId: number;
}

interface AccountData {
  accountNumber: string;
  accountTypeName?: string;
}

export function MobileDrawerMenu({ onNavigate }: MobileDrawerMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const [userRes, accountsRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/user/accounts', { credentials: 'include' }),
        ]);
        
        const userData = await userRes.json();
        const accountsData = await accountsRes.json();
        
        if (userData.success) {
          setUser(userData.user);
        }
        if (accountsData.success && accountsData.accounts?.length > 0) {
          setAccount(accountsData.accounts[0]);
        }
      } catch {
        // ignore
      }
    };
    fetchUserData();
  }, []);

  const items = [
    { label: "Manage Accounts", icon: CreditCard, href: "/accounts" },
    { label: "One click trade locked", icon: Lock, href: "#" },
    { label: "Create Demo", icon: CreditCard, href: "/accounts" },
    { label: "Change Password", icon: Settings, href: "/profile" },
    { label: "Trades", icon: BarChart3, href: "/" },
    { label: "History", icon: History, href: "/history" },
    { label: "Journal", icon: Wallet, href: "/wallet" },
    { label: "About", icon: HelpCircle, href: "#" },
  ];

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      onNavigate?.();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* User Info Header */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-slate-800 rounded-xl flex items-center justify-center">
            <div className="w-12 h-12 bg-linear-to-br from-green-400 via-blue-500 to-purple-500 rounded-full" />
          </div>
        </div>
        <div className="bg-yellow-400 text-black text-center py-1.5 rounded font-medium text-sm mb-3">
          {account?.accountTypeName || 'Trading'}
        </div>
        <div className="text-sm">
          <div><span className="text-muted-foreground">Client:</span> {user?.name || 'User'}</div>
          <div><span className="text-muted-foreground">Account:</span> {account?.accountNumber || 'N/A'} - NalmiFX</div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => onNavigate?.()}
              className="flex items-center gap-4 px-4 py-3.5 text-sm hover:bg-accent border-b border-border/50"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-3.5 text-sm hover:bg-accent border-b border-border/50 text-red-500"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}



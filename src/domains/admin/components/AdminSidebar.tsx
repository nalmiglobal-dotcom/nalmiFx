"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Wallet, 
  Users2, 
  CreditCard, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
  Menu,
  X,
  Trophy,
  Mail
} from "lucide-react";
import { cn } from "@/shared/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  children?: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "Overview Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/admin",
  },
  {
    title: "User Management",
    icon: <Users className="w-5 h-5" />,
    path: "/admin/users",
  },
  {
    title: "Trade Management",
    icon: <TrendingUp className="w-5 h-5" />,
    path: "/admin/trades",
    children: [
      { title: "All Trades", path: "/admin/trades" },
      { title: "Open Positions", path: "/admin/trades/open" },
      { title: "Closed Positions", path: "/admin/trades/closed" },
      { title: "Pending Orders", path: "/admin/trades/pending" },
      { title: "Trade History", path: "/admin/trades/history" },
      { title: "Trade Analytics", path: "/admin/trades/analytics" },
    ],
  },
  {
    title: "Fund Management",
    icon: <Wallet className="w-5 h-5" />,
    path: "/admin/funds",
    children: [
      { title: "Fund Requests", path: "/admin/funds/requests" },
      { title: "Transactions", path: "/admin/funds/transactions" },
      { title: "Balance Management", path: "/admin/funds/balance" },
      { title: "Add bank", path: "/admin/funds/bank" },
    ],
  },
  {
    title: "IB Management",
    icon: <Users2 className="w-5 h-5" />,
    path: "/admin/ib",
    children: [
      { title: "IB Overview", path: "/admin/ib" },
      { title: "IB Requests", path: "/admin/ib-requests" },
      { title: "IB Accounts", path: "/admin/ib/accounts" },
      { title: "IB Settings", path: "/admin/ib/settings" },
      { title: "IB Withdrawals", path: "/admin/ib/withdrawals" },
      { title: "Performance", path: "/admin/ib/performance" },
      { title: "Commissions", path: "/admin/ib/commissions" },
      { title: "Commission History", path: "/admin/ib/commissions/history" },
      { title: "Tier Management", path: "/admin/ib/tiers" },
    ],
  },
  {
    title: "Charges Management",
    icon: <CreditCard className="w-5 h-5" />,
    path: "/admin/charges",
    children: [
      { title: "Trading Settings", path: "/admin/trading-settings" },
      { title: "Broker Income", path: "/admin/broker-income" },
      { title: "Fee Structure", path: "/admin/charges" },
      { title: "Spread Management", path: "/admin/charges/spreads" },
      { title: "Commission Rates", path: "/admin/charges/commissions" },
      { title: "Swap Rates", path: "/admin/charges/swaps" },
      { title: "Charge History", path: "/admin/charges/history" },
    ],
  },
  {
    title: "Competition Management",
    icon: <Trophy className="w-5 h-5" />,
    path: "/admin/competitions",
    children: [
      { title: "All Competitions", path: "/admin/competitions" },
      { title: "Create Competition", path: "/admin/competitions?create=true" },
      { title: "Challenge Management", path: "/admin/challenge-management" },
      { title: "Payout Management", path: "/admin/payout-management" },
    ],
  },
  // {
  //   title: "Admin Management",
  //   icon: <Shield className="w-5 h-5" />,
  //   path: "/admin/admin-management",
  //   children: [
  //     { title: "All Admins", path: "/admin/admin-management" },
  //     { title: "Admin Wallets", path: "/admin/admin-management/wallets" },
  //     { title: "Settlements", path: "/admin/admin-management/settlements" },
  //     { title: "Admin Activity", path: "/admin/admin-management/activity" },
  //   ],
  // },
  {
    title: "Email Templates",
    icon: <Mail className="w-5 h-5" />,
    path: "/admin/email-templates",
  },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminSidebar({ collapsed: controlledCollapsed, onCollapsedChange }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(value);
    } else {
      setInternalCollapsed(value);
    }
  };

  const [openItems, setOpenItems] = useState<string[]>(() => {
    // Open the menu item that matches current path
    const currentItem = menuItems.find(
      (item) => item.children && item.children.some((child) => child.path === pathname)
    );
    return currentItem ? [currentItem.path] : [];
  });

  const toggleItem = (path: string) => {
    setOpenItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const isChildActive = (children: { path: string }[]) => {
    return children.some((child) => pathname === child.path);
  };

  return (
    <aside className={cn(
      "bg-[#1a1025] border-r border-[#2a2035] h-screen flex flex-col shrink-0 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-[#2a2035]">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
            <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg text-white">Admin Panel</h1>
                <p className="text-xs text-white/50">Management Dashboard</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-purple-600/20 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full mt-2 p-1.5 rounded-lg hover:bg-purple-600/20 text-white/60 hover:text-white transition-colors flex justify-center"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openItems.includes(item.path);
            const active = isActive(item.path);
            const childActive = hasChildren && isChildActive(item.children!);

            if (hasChildren) {
              return (
                <li key={item.path}>
                  {collapsed ? (
                    <button
                      onClick={() => router.push(item.path)}
                      title={item.title}
                      className={cn(
                        "w-full flex items-center justify-center p-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        "hover:bg-purple-600/10 text-white/60 hover:text-white",
                        (active || childActive) && "bg-purple-600/20 text-purple-400 border border-purple-500/20"
                      )}
                    >
                      {item.icon}
                    </button>
                  ) : (
                    <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.path)}>
                      <CollapsibleTrigger
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                          "hover:bg-purple-600/10 text-white/60 hover:text-white",
                          (active || childActive) && "bg-purple-600/20 text-purple-400 border border-purple-500/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-8 pt-1 space-y-1">
                        {item.children!.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => router.push(child.path)}
                            className={cn(
                              "w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left",
                              "hover:bg-purple-600/10 text-white/50 hover:text-white",
                              pathname === child.path && "bg-purple-600/20 text-purple-400 font-medium"
                            )}
                          >
                            {child.title}
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </li>
              );
            }

            return (
              <li key={item.path}>
                <button
                  onClick={() => router.push(item.path)}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                    "hover:bg-purple-600/10 text-white/60 hover:text-white",
                    active && "bg-purple-600/20 text-purple-400 border border-purple-500/20",
                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.title}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}


"use client";

import { Home, BarChart3, Wallet, User, UserPlus, LayoutDashboard, PieChart, Trophy, Users } from "lucide-react";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SidebarProps {
  onOpenInstruments?: () => void;
  onCloseInstruments?: () => void;
  showInstruments?: boolean;
}

const menuItems = [
  { icon: Home, label: "Home", path: "/userdashboard/home" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/userdashboard/chart" },
  { icon: BarChart3, label: "Instruments", path: "/userdashboard/instrument" },
  { icon: Trophy, label: "Competitions", path: "/competitions" },
  { icon: PieChart, label: "Portfolio", path: "/portfolio" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: UserPlus, label: "IB Apply", path: "/userdashboard/ib" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function Sidebar({ onOpenInstruments, onCloseInstruments, showInstruments }: SidebarProps) {
  const pathname = usePathname();
  const [isIBApproved, setIsIBApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovalStatus();
  }, []);

  const fetchApprovalStatus = async () => {
    try {
      // Fetch user data to check IB approval
      const userRes = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && userData.user) {
          // IB approved if user has ib_code and isIB is true
          setIsIBApproved(!!(userData.user.ib_code && userData.user.isIB));
        }
      }

    } catch (error) {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const getSubdomainUrl = (subdomain: string) => {
    if (typeof window === 'undefined') return '#';
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Handle localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${subdomain}.localhost${port}`;
    }
    
    // Handle production subdomains
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.'); // setupx.com
      return `${protocol}//${subdomain}.${rootDomain}${port}`;
    }
    
    // Fallback
    return `${protocol}//${subdomain}.${hostname}${port}`;
  };

  const handleIBPanelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isIBApproved) {
      window.location.href = getSubdomainUrl('ib');
    }
  };


  const isActive = (path?: string) => {
    if (!path) return false;
    // Exact match for home route
    if (path === '/userdashboard/home') {
      return pathname === '/userdashboard/home' || pathname === '/userdashboard';
    }
    // Exact match for chart route
    if (path === '/userdashboard/chart') {
      return pathname === '/userdashboard/chart';
    }
    // Exact match for instrument route
    if (path === '/userdashboard/instrument') {
      return pathname === '/userdashboard/instrument';
    }
    // For other routes, check if pathname starts with the path
    return pathname?.startsWith(path);
  };

  return (
    <div className="hidden lg:flex w-16 bg-sidebar border-r border-sidebar-border flex-col items-center py-4 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-6">
        <span className="text-primary-foreground font-bold text-lg">PT</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {menuItems.map((item) => {
          const active = isActive(item.path);

          // Special handling for Dashboard and Instruments items
          if (item.label === "Instruments") {
            return (
              <button
                key={item.label}
                onClick={() => onOpenInstruments?.()}
                title={item.label}
                className={`w-full py-3 flex items-center justify-center rounded-lg transition-colors ${
                  active 
                    ? 'text-foreground bg-sidebar-accent' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          }

          if (item.label === "Dashboard") {
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (pathname === '/userdashboard/chart') {
                    onCloseInstruments?.();
                  } else {
                    window.location.href = '/userdashboard/chart';
                  }
                }}
                title={item.label}
                className={`w-full py-3 flex items-center justify-center rounded-lg transition-colors ${
                  active 
                    ? 'text-foreground bg-sidebar-accent' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.path!}
              title={item.label}
              className={`w-full py-3 flex items-center justify-center rounded-lg transition-colors ${
                active 
                  ? 'text-foreground bg-sidebar-accent' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}

        {/* IB Panel - Only show if approved */}
        {!loading && isIBApproved && (
          <button
            onClick={handleIBPanelClick}
            className="w-full py-3 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="IB Panel"
          >
            <Users className="w-5 h-5" />
          </button>
        )}

      </nav>
    </div>
  );
}

"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, LayoutDashboard, Wallet, PieChart, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/userdashboard/home" },
  { icon: LayoutDashboard, label: "Trade", path: "/userdashboard/chart" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: PieChart, label: "Portfolio", path: "/portfolio" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/home') return pathname === '/home';
    return pathname?.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <nav className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-1 ${active ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

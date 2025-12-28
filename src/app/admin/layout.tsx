"use client";

import { useState } from "react";
import { AdminSidebar } from "@/domains/admin/components/AdminSidebar";
import { AdminHeader } from "@/domains/admin/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen bg-[#0f0a1f] overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-40">
        <AdminHeader />
      </div>

      <div className="fixed top-0 left-0 z-50">
        <AdminSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      <main
        className={
          "h-screen overflow-y-auto bg-[#0f0a1f] pt-14 " +
          (collapsed ? "pl-16" : "pl-64")
        }
      >
        {children}
      </main>
    </div>
  );
}

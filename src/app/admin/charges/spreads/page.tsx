"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SpreadManagementPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/trading-settings');
  }, [router]);

  return (
    <div className="p-6 flex items-center justify-center h-[50vh]">
      <p className="text-muted-foreground">Redirecting to Trading Settings...</p>
    </div>
  );
}


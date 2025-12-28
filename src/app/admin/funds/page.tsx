"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FundsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Fund Requests where deposits/withdrawals are consolidated
    router.replace("/admin/funds/requests");
  }, [router]);

  return null;
}


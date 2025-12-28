"use client";

import { Card } from "@/shared/components/ui/card";

export default function CommissionRatesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commission Rates</h1>
        <p className="text-sm text-muted-foreground mt-1">Set commission rates for different instruments</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Commission rates content will be added here...</p>
      </Card>
    </div>
  );
}


"use client";

import { Card } from "@/shared/components/ui/card";

export default function TradeAnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trade Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Advanced analytics and insights for trading activities</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Trade analytics content will be added here...</p>
      </Card>
    </div>
  );
}


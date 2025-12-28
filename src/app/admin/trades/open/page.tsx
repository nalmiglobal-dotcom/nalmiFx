"use client";

import { Card } from "@/shared/components/ui/card";

export default function OpenPositionsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Open Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all currently open trading positions</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Open positions content will be added here...</p>
      </Card>
    </div>
  );
}


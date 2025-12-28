"use client";

import { Card } from "@/shared/components/ui/card";

export default function AdminActivityPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">View and monitor admin activity logs</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Admin activity content will be added here...</p>
      </Card>
    </div>
  );
}


"use client";

import { Card } from "@/shared/components/ui/card";

export default function InactiveUsersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inactive Users</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage inactive user accounts</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Inactive users content will be added here...</p>
      </Card>
    </div>
  );
}


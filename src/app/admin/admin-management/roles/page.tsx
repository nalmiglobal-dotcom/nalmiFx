"use client";

import { Card } from "@/shared/components/ui/card";

export default function AdminRolesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage admin roles and access levels</p>
      </div>

      <Card className="p-6 bg-card border-border">
        <p className="text-sm text-muted-foreground">Admin roles content will be added here...</p>
      </Card>
    </div>
  );
}


"use client";

import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/ui/badge";

interface PerformanceStat {
  ib_user_id: number;
  ib_user_name: string;
  totalCommission: number;
  referredUsersCount: number;
}

export default function PerformancePage() {
  const [performance, setPerformance] = useState<PerformanceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await fetch('/api/admin/ib/performance', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPerformance(data.performance);
      } else {
        console.error("Failed to fetch performance:", data.message);
      }
    } catch (error) {
      console.error("An error occurred while fetching performance:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IB Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and analyze IB performance.
        </p>
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4">IB Performance Stats</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IB</TableHead>
                <TableHead className="text-right">Total Commission</TableHead>
                <TableHead className="text-center">Referred Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((stat) => (
                <TableRow key={stat.ib_user_id}>
                  <TableCell>
                    <div className="font-medium">{stat.ib_user_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {stat.ib_user_id}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-green-500">
                      ${stat.totalCommission.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {stat.referredUsersCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
         {!loading && performance.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No performance data found.</p>
        )}
      </Card>
    </div>
  );
}

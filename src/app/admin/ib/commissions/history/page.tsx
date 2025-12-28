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

interface Commission {
  _id: string;
  ib_user_id: number;
  ib_user_name: string;
  referred_user_id: number;
  referred_user_name: string;
  commission_amount: number;
  brokerage: number;
  createdAt: string;
}

export default function CommissionHistoryPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const res = await fetch('/api/admin/ib/commissions', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setCommissions(data.commissions);
      } else {
        console.error("Failed to fetch commissions:", data.message);
      }
    } catch (error) {
      console.error("An error occurred while fetching commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          IB Commission History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View the history of IB commissions.
        </p>
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4">Commission History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IB</TableHead>
                <TableHead>Referred User</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission._id}>
                  <TableCell>
                    <div className="font-medium">{commission.ib_user_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {commission.ib_user_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{commission.referred_user_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {commission.referred_user_id}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-green-500">
                      ${commission.commission_amount.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(commission.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && commissions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No commission history found.</p>
        )}
      </Card>
    </div>
  );
}
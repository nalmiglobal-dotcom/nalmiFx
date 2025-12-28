"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";

interface IBWithdrawal {
  _id: string;
  ib_user_id: number;
  ib_user_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetails: string;
  createdAt: string;
}

export default function IbWithdrawalsPage() {
  const { Dialog: ConfirmDialog } = useConfirmationDialog();
  const [withdrawals, setWithdrawals] = useState<IBWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ib/withdrawals", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch withdrawals.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRequest = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/ib/withdrawals/${id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        // Update the status in the local state to give immediate feedback
        setWithdrawals(prev => 
            prev.map(w => w._id === id ? { ...w, status: status } : w)
        );
      } else {
        toast.error(`Failed to update request: ${data.message}`);
      }
    } catch (err) {
      toast.error("An error occurred while updating the request.");
    }
  }

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="text-yellow-500">Pending</Badge>;
        case 'approved':
            return <Badge variant="outline" className="text-green-500">Approved</Badge>;
        case 'rejected':
            return <Badge variant="outline" className="text-red-500">Rejected</Badge>;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">IB Withdrawals</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Process and manage IB withdrawal requests.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>IB</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Details</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {withdrawals.map((w) => (
                        <TableRow key={w._id}>
                        <TableCell>
                            <div className="font-medium">{w.ib_user_name}</div>
                            <div className="text-sm text-muted-foreground">ID: {w.ib_user_id}</div>
                        </TableCell>
                        <TableCell>${w.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.paymentDetails}</TableCell>
                        <TableCell>{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(w.status)}</TableCell>
                        <TableCell>
                            {w.status === 'pending' && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-100" onClick={() => handleUpdateRequest(w._id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-100" onClick={() => handleUpdateRequest(w._id, 'rejected')}>Reject</Button>
                                </div>
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
            {!loading && withdrawals.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No withdrawal requests found.</p>
            )}
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>
      <ConfirmDialog />
    </div>
  );
}
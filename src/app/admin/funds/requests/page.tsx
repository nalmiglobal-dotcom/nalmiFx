"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";

interface ITransaction {
  _id: string;
  userId: number;
  userName: string;
  userEmail: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: string;
  transactionId?: string;
  accountDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
    upiId?: string;
    cryptoAddress?: string;
    cryptoType?: string;
    paypalEmail?: string;
  };
  adminNotes?: string;
  createdAt: string;
}

export default function FundRequestsPage() {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the dialogs
  const [selectedTx, setSelectedTx] = useState<ITransaction | null>(null);
  const [notes, setNotes] = useState("");
  const [isApproveDialogOpen, setApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/funds/requests');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (tx: ITransaction, status: 'approved' | 'rejected', adminNotes: string) => {
    try {
      const res = await fetch(`/api/admin/funds/requests/${tx._id}`, {
        method: "PUT",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Transaction ${status}.`);
        setTransactions(prev =>
          prev.map(t => t._id === tx._id ? { ...t, status, adminNotes } : t)
        );
        return true;
      } else {
        toast.error(`Failed to update: ${data.message}`);
        return false;
      }
    } catch (err) {
      toast.error("An error occurred while updating the request.");
      return false;
    }
  };

  const handleApproveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedTx) {
      const success = await handleUpdate(selectedTx, 'approved', notes);
      if (success) {
        setApproveDialogOpen(false);
      }
    }
  };
  
  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedTx) {
      const success = await handleUpdate(selectedTx, 'rejected', notes);
      if (success) {
        setRejectDialogOpen(false);
      }
    }
  };

  const openApproveDialog = (tx: ITransaction) => {
    setSelectedTx(tx);
    setNotes(tx.adminNotes || "");
    setApproveDialogOpen(true);
  };
  
  const openRejectDialog = (tx: ITransaction) => {
    setSelectedTx(tx);
    setNotes(tx.adminNotes || "");
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-500 capitalize">{status}</Badge>;
      case 'approved': return <Badge variant="outline" className="text-green-500 capitalize">{status}</Badge>;
      case 'rejected': return <Badge variant="outline" className="text-red-500 capitalize">{status}</Badge>;
      default: return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Fund Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>A list of all deposit and withdrawal requests from users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading transactions...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell>
                      <div className="font-medium">{tx.userName}</div>
                      <div className="text-sm text-muted-foreground">{tx.userEmail}</div>
                    </TableCell>
                    <TableCell className="capitalize">{tx.type}</TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {tx.type === 'withdrawal' && tx.accountDetails ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Details</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Withdrawal Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-4 text-sm">
                              {Object.entries(tx.accountDetails).map(([key, value]) => (
                                value && (
                                  <div key={key} className="flex items-center justify-between">
                                    <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                    <span className="font-mono text-right break-all">{value}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : tx.transactionId ? (
                        <div className="text-sm text-muted-foreground">ID: {tx.transactionId}</div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {tx.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-100" onClick={() => openApproveDialog(tx)}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-100" onClick={() => openRejectDialog(tx)}>Reject</Button>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">{tx.adminNotes}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && transactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No pending transactions found.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setSelectedTx(null); setApproveDialogOpen(isOpen); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Transaction</DialogTitle>
            <CardDescription>Optionally add a note for this approval for {selectedTx?.userName}.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleApproveSubmit}>
            <div className="grid gap-4 py-4">
              <Label htmlFor="approveNotes">Notes</Label>
              <Textarea id="approveNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional approval notes..." />
            </div>
            <DialogFooter>
              <Button type="submit">Confirm Approval</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setSelectedTx(null); setRejectDialogOpen(isOpen); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <CardDescription>Provide a reason for rejecting this transaction for {selectedTx?.userName}.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleRejectSubmit}>
            <div className="grid gap-4 py-4">
              <Label htmlFor="rejectNotes">Rejection Reason</Label>
              <Textarea id="rejectNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rejection reason..." />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive">Confirm Rejection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Edit2, Check, X } from "lucide-react";

interface IBAccount {
  userId: number;
  name: string;
  email: string;
  ib_code: string;
  isIB: boolean;
  ib_commission_rate: number;
  referredCount: number;
  totalCommission: number;
  createdAt: string;
}

export default function IBAccountsPage() {
  const [accounts, setAccounts] = useState<IBAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ib/accounts', { credentials: 'include' });
      const json = await res.json();
      if (!json || !json.success) {
        toast.error(json?.message || 'Failed to load IB accounts');
        setAccounts([]);
      } else {
        setAccounts(json.accounts || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load IB accounts');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (account: IBAccount) => {
    setEditingId(account.userId);
    setEditValue(((account.ib_commission_rate || 0.1) * 100).toFixed(1));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveCommission = async (userId: number) => {
    const rate = parseFloat(editValue) / 100;
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Invalid commission rate');
      return;
    }

    try {
      const res = await fetch('/api/admin/ib/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ib_commission_rate: rate }),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Commission rate updated');
        setAccounts(prev => prev.map(a => 
          a.userId === userId ? { ...a, ib_commission_rate: rate } : a
        ));
        cancelEdit();
      } else {
        toast.error(json.message || 'Failed to update');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update commission rate');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IB Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage IB accounts and their commission rates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All IB Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No IB accounts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IB</TableHead>
                  <TableHead>IB Code</TableHead>
                  <TableHead className="text-center">Referred Users</TableHead>
                  <TableHead className="text-right">Total Commission</TableHead>
                  <TableHead className="text-center">Commission Rate</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.userId}>
                    <TableCell>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground">{account.email}</div>
                      <div className="text-xs text-muted-foreground">ID: {account.userId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.ib_code}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {account.referredCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-green-500">
                        ${account.totalCommission.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === account.userId ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 text-center"
                          />
                          <span>%</span>
                          <Button size="icon" variant="ghost" onClick={() => saveCommission(account.userId)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-center">
                          <span>{((account.ib_commission_rate || 0.1) * 100).toFixed(1)}%</span>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(account)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


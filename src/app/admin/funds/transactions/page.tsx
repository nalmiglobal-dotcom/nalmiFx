"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  _id: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [range]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("range", range);
      const res = await fetch(`/api/admin/transactions?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        if (typeof data.totalAmount === "number") setTotalAmount(data.totalAmount);
        else setTotalAmount(null);
      } else {
        // API might not support range; show whatever returned
        setTransactions(data.transactions || []);
        toast.error(data.message || "Failed to fetch transactions");
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      toast.error("Network error while fetching transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.userName || "").toLowerCase().includes(s) ||
      (t.userEmail || "").toLowerCase().includes(s) ||
      t._id.includes(s) ||
      t.userId.toString().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">View financial transactions and reports</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Choose a range to view daily, weekly or monthly transactions</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Search by user, email or id..." />
              </div>
              <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
                <TabsList>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">Range:</div>
              <div className="font-medium capitalize">{range}</div>
              <div className="ml-auto text-sm text-muted-foreground">Total transactions: {transactions.length}</div>
              <div className="text-sm text-muted-foreground">{totalAmount !== null ? `Total amount: $${totalAmount.toFixed(2)}` : ''}</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions found for this range.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <div key={t._id} className="p-3 border rounded bg-background/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.userName || `User #${t.userId}`}</div>
                      <div className="text-xs text-muted-foreground">{t.userEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${t.amount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


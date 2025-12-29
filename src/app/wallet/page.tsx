"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";

interface ITransaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'challenge_purchase' | 'challenge_payout';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
}

export default function WalletPage() {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/user/wallet', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletBalance(data.wallet.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/user/transactions', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="text-yellow-500 capitalize">{status}</Badge>;
        case 'approved':
            return <Badge variant="outline" className="text-green-500 capitalize">{status}</Badge>;
        case 'rejected':
            return <Badge variant="outline" className="text-red-500 capitalize">{status}</Badge>;
    }
  }

  const getTypeLabel = (type: ITransaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'challenge_purchase':
        return 'Challenge Purchase';
      case 'challenge_payout':
        return 'Challenge Payout';
      default:
        return type;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-4xl">
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Wallet</h1>
              <p className="text-sm text-muted-foreground mt-1">Your main balance for deposits and withdrawals</p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Wallet Balance
                </CardTitle>
                <CardDescription>Real money balance - use this for deposits and withdrawals</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                      ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
                      <Button onClick={() => window.location.href = '/deposit'} size="lg" className="w-full sm:w-auto">
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Deposit
                      </Button>
                      <Button onClick={() => window.location.href = '/withdraw'} variant="outline" size="lg" className="w-full sm:w-auto">
                        <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Transaction History</CardTitle>
                    <CardDescription className="text-sm">A record of your deposits, withdrawals, challenge purchases, and challenge payouts.</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    {loadingTransactions ? (
                        <p className="text-center text-muted-foreground py-8">Loading history...</p>
                    ) : (
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs sm:text-sm">Type</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Date</TableHead>
                                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Admin Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx._id}>
                                            <TableCell className="font-medium text-xs sm:text-sm">{getTypeLabel(tx.type)}</TableCell>
                                            <TableCell className={`text-xs sm:text-sm ${tx.type === 'deposit' || tx.type === 'challenge_payout' ? 'text-green-500' : 'text-red-500'}`}>
                                                ${tx.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{tx.adminNotes || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {!loadingTransactions && transactions.length === 0 && (
                        <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet.</p>
                    )}
                </CardContent>
            </Card>

          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
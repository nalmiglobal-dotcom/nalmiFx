"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Wallet, CreditCard } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";

interface Account {
  _id: string;
  accountType: 'trading';
  accountTypeName?: string;
  accountNumber: string;
  accountName: string;
  balance: number;
}

export default function TransferPage() {
  const [fromType, setFromType] = useState<'wallet' | 'trading'>('wallet');
  const [toType, setToType] = useState<'wallet' | 'trading'>('trading');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setFromAccountId('');
    setToAccountId('');
  }, [fromType, toType]);

  const fetchData = async () => {
    try {
      const [accountsRes, walletRes] = await Promise.all([
        fetch('/api/user/accounts', { credentials: 'include' }),
        fetch('/api/user/wallet', { credentials: 'include' }),
      ]);

      const accountsData = await accountsRes.json();
      const walletData = await walletRes.json();

      if (accountsData.success) {
        setAccounts(accountsData.accounts || []);
      }

      if (walletData.success && walletData.wallet) {
        setWalletBalance(walletData.wallet.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBalance = (): number => {
    if (fromType === 'wallet') {
      return walletBalance;
    }
    const account = accounts.find(a => a._id === fromAccountId);
    return account?.balance || 0;
  };

  const handleTransfer = async () => {
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (transferAmount > getAvailableBalance()) {
      toast.error('Insufficient balance');
      return;
    }

    if (fromType === toType && fromAccountId === toAccountId) {
      toast.error('Cannot transfer to the same account');
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch('/api/user/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromType,
          toType,
          fromAccountId: fromType === 'trading' ? fromAccountId : undefined,
          toAccountId: toType === 'trading' ? toAccountId : undefined,
          amount: transferAmount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Transfer successful');
        setAmount('');
        fetchData();
      } else {
        toast.error(data.message || 'Transfer failed');
      }
    } catch (error) {
      toast.error('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="container mx-auto p-4 lg:p-6 max-w-2xl">
            <h1 className="text-2xl lg:text-3xl font-bold mb-6">Transfer Funds</h1>

            <Card>
              <CardHeader>
                <CardTitle>Internal Transfer</CardTitle>
                <CardDescription>Transfer between wallet and trading accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* From */}
                <div className="space-y-3">
                  <Label>From</Label>
                  <RadioGroup value={fromType} onValueChange={(v) => setFromType(v as 'wallet' | 'trading')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="wallet" id="from-wallet" />
                      <Label htmlFor="from-wallet" className="flex items-center gap-2 cursor-pointer">
                        <Wallet className="w-4 h-4" /> Wallet
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="trading" id="from-trading" />
                      <Label htmlFor="from-trading" className="flex items-center gap-2 cursor-pointer">
                        <CreditCard className="w-4 h-4" /> Trading Account
                      </Label>
                    </div>
                  </RadioGroup>

                  {fromType === 'wallet' ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Available: <span className="font-semibold text-foreground">${walletBalance.toFixed(2)}</span></p>
                    </div>
                  ) : (
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.accountTypeName || 'Trading'} #{account.accountNumber} - ${account.balance.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex justify-center">
                  <ArrowLeftRight className="w-6 h-6 text-muted-foreground" />
                </div>

                {/* To */}
                <div className="space-y-3">
                  <Label>To</Label>
                  <RadioGroup value={toType} onValueChange={(v) => setToType(v as 'wallet' | 'trading')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="wallet" id="to-wallet" />
                      <Label htmlFor="to-wallet" className="flex items-center gap-2 cursor-pointer">
                        <Wallet className="w-4 h-4" /> Wallet
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="trading" id="to-trading" />
                      <Label htmlFor="to-trading" className="flex items-center gap-2 cursor-pointer">
                        <CreditCard className="w-4 h-4" /> Trading Account
                      </Label>
                    </div>
                  </RadioGroup>

                  {toType === 'wallet' ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Wallet</p>
                    </div>
                  ) : (
                    <Select value={toAccountId} onValueChange={setToAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.accountTypeName || 'Trading'} #{account.accountNumber} - ${account.balance.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available: ${getAvailableBalance().toFixed(2)}
                  </p>
                </div>

                <Button onClick={handleTransfer} disabled={transferring} className="w-full">
                  {transferring ? 'Processing...' : 'Transfer'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

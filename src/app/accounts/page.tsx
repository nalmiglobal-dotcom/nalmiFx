"use client";

import { useState, useEffect } from "react";
import { Building2, CreditCard, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface Account {
  _id: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  equity: number;
  status: string;
}

interface TradingSettings {
  minDeposit: number;
  leverage: number;
  tradeCharges: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<TradingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, settingsRes] = await Promise.all([
        fetch('/api/user/accounts', { credentials: 'include' }),
        fetch('/api/trading/settings', { credentials: 'include' })
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        if (accountsData.success) {
          setAccounts(accountsData.accounts || []);
        }
      } else if (accountsRes.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setSettings(settingsData.settings);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    const deposit = parseFloat(initialDeposit);
    if (isNaN(deposit) || deposit <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    const minDeposit = settings?.minDeposit || 100;
    if (deposit < minDeposit) {
      toast.error(`Minimum deposit is $${minDeposit}`);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/user/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ initialDeposit: deposit }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Account created successfully');
        setOpenDialog(false);
        setInitialDeposit('');
        loadData();
      } else {
        toast.error(data.message || 'Failed to create account');
      }
    } catch (error: any) {
      toast.error(error.message || 'Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Trading Accounts</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your trading accounts</p>
              </div>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Open Trading Account</DialogTitle>
                    <DialogDescription>
                      Enter initial deposit to create your trading account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {settings && (
                      <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min Deposit:</span>
                          <span className="font-medium">${settings.minDeposit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Leverage:</span>
                          <span className="font-medium">1:{settings.leverage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trade Charges:</span>
                          <span className="font-medium">${settings.tradeCharges}/trade</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label>Initial Deposit ($)</Label>
                      <Input
                        type="number"
                        value={initialDeposit}
                        onChange={(e) => setInitialDeposit(e.target.value)}
                        placeholder={`Min: $${settings?.minDeposit || 100}`}
                        className="mt-2"
                        min={settings?.minDeposit || 100}
                        step="0.01"
                      />
                    </div>

                    <Button onClick={handleCreateAccount} disabled={creating} className="w-full">
                      {creating ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No trading accounts yet</p>
                  <Button onClick={() => setOpenDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <Card key={account._id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          <span>Trading Account</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          account.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-muted'
                        }`}>
                          {account.status}
                        </span>
                      </CardTitle>
                      <CardDescription>#{account.accountNumber}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-semibold">${account.balance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Equity</span>
                          <span className="font-semibold">${account.equity.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

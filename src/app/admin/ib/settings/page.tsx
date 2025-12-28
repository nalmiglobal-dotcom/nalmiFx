"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { useEffect, useState, FormEvent } from "react";
import { toast } from "sonner";

interface IIBSettings {
  defaultCommissionRate: number;
  minWithdrawalAmount: number;
  kycRequiredForWithdrawal: boolean;
  cookieDurationDays: number;
}

const initialSettings: IIBSettings = {
    defaultCommissionRate: 0,
    minWithdrawalAmount: 0,
    kycRequiredForWithdrawal: false,
    cookieDurationDays: 0,
};

export default function IbSettingsPage() {
  const [settings, setSettings] = useState<IIBSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ib/settings", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, kycRequiredForWithdrawal: checked }));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/ib/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settings updated successfully!");
        setSettings(data.settings);
      } else {
        toast.error(`Failed to update settings: ${data.message}`);
        setError(data.message);
      }
    } catch (err) {
      toast.error("An error occurred while updating settings.");
      setError("An error occurred while updating settings.");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">IB Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>IB Program Settings</CardTitle>
          <CardDescription>Configure the global settings for the Introducing Broker program.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="defaultCommissionRate">Default Commission Rate (%)</Label>
                    <Input
                        id="defaultCommissionRate"
                        name="defaultCommissionRate"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 5"
                        value={settings.defaultCommissionRate * 100}
                        onChange={(e) => setSettings(s => ({...s, defaultCommissionRate: parseFloat(e.target.value) / 100}))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="minWithdrawalAmount">Minimum Withdrawal Amount ($)</Label>
                    <Input
                        id="minWithdrawalAmount"
                        name="minWithdrawalAmount"
                        type="number"
                        step="1"
                        placeholder="e.g., 50"
                        value={settings.minWithdrawalAmount}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cookieDurationDays">Referral Cookie Duration (Days)</Label>
                    <Input
                        id="cookieDurationDays"
                        name="cookieDurationDays"
                        type="number"
                        step="1"
                        placeholder="e.g., 30"
                        value={settings.cookieDurationDays}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="flex items-center space-x-4 rounded-md border p-4">
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">KYC Required for Withdrawal</p>
                        <p className="text-sm text-muted-foreground">
                        If enabled, IBs must be KYC verified to withdraw commissions.
                        </p>
                    </div>
                    <Switch
                        id="kycRequiredForWithdrawal"
                        checked={settings.kycRequiredForWithdrawal}
                        onCheckedChange={handleSwitchChange}
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
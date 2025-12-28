"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { 
  DollarSign, TrendingUp, Settings, History, 
  ArrowRight, Percent, Layers, BarChart3 
} from "lucide-react";
import { toast } from "sonner";

interface Summary {
  totalTrades: number;
  totalSpreadIncome: number;
  totalCommissionIncome: number;
  totalChargesCollected: number;
  currentSettings?: {
    globalSpreadPips: number;
    globalChargeType: string;
    globalChargeAmount: number;
  };
}

export default function FeeStructurePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/admin/trade-charges?limit=1', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getChargeTypeLabel = (type: string) => {
    switch (type) {
      case 'per_lot': return 'Per Lot';
      case 'per_execution': return 'Per Trade';
      case 'percentage': return 'Percentage';
      default: return type || '-';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Charge Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure and monitor trading fees, spreads, and commissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Trades Charged</p>
                <p className="text-2xl font-bold">{loading ? '...' : summary?.totalTrades || 0}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Spread Income</p>
                <p className="text-2xl font-bold text-green-500">
                  {loading ? '...' : formatCurrency(summary?.totalSpreadIncome || 0)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Commission Income</p>
                <p className="text-2xl font-bold text-blue-500">
                  {loading ? '...' : formatCurrency(summary?.totalCommissionIncome || 0)}
                </p>
              </div>
              <Percent className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-amber-500">
                  {loading ? '...' : formatCurrency(summary?.totalChargesCollected || 0)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Settings */}
      {summary?.currentSettings && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground font-medium">Active Settings:</span>
                <span>
                  <strong>Spread:</strong> {summary.currentSettings.globalSpreadPips} pips
                </span>
                <span>
                  <strong>Charge:</strong> {getChargeTypeLabel(summary.currentSettings.globalChargeType)} @ ${summary.currentSettings.globalChargeAmount}
                </span>
              </div>
              <Link href="/admin/trading-settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/trading-settings">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Trading Settings
              </CardTitle>
              <CardDescription>
                Configure global spreads, commission types, and per-instrument settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary">
                Manage Settings <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/charges/history">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Charge History
              </CardTitle>
              <CardDescription>
                View detailed history of all trade charges with filters and export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-blue-500">
                View History <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/charges/spreads">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Spread Management
              </CardTitle>
              <CardDescription>
                Configure per-instrument spread overrides and segment-wise settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-amber-500">
                Manage Spreads <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-500 mb-2">How Trade Charges Work</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Spread:</strong> Added to market price when user opens a trade (BUY at ASK, SELL at BID)</li>
            <li>• <strong>Commission:</strong> Flat fee or percentage deducted from user wallet on trade execution</li>
            <li>• <strong>Per Lot:</strong> Charge multiplied by lot size (e.g., $5 × 0.5 lot = $2.50)</li>
            <li>• <strong>Per Execution:</strong> Fixed charge per trade regardless of lot size</li>
            <li>• <strong>Percentage:</strong> Calculated as % of trade value (lot × contract size × price)</li>
            <li>• <strong>Segment Charges:</strong> Override global charges for specific markets (forex, crypto, etc.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


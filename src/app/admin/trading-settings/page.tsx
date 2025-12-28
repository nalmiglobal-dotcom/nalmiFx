"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { toast } from "sonner";
import { Save, Plus, Trash2, DollarSign, TrendingUp, Settings2 } from "lucide-react";

interface SpreadConfig {
  symbol: string;
  spreadPips: number;
  enabled: boolean;
}

interface SegmentCharge {
  segment: string;
  chargeType: 'per_lot' | 'per_execution' | 'percentage';
  chargeAmount: number;
  minCharge: number;
  maxCharge: number;
  enabled: boolean;
}

interface TradingSettings {
  globalSpreadPips: number;
  globalChargeType: 'per_lot' | 'per_execution' | 'percentage';
  globalChargeAmount: number;
  globalMinCharge: number;
  globalMaxCharge: number;
  instrumentSpreads: SpreadConfig[];
  segmentCharges: SegmentCharge[];
}

const defaultInstruments = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD",
  "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "GBPJPY", "EURJPY",
  "US30", "US100", "US500", "DE40", "XAGUSD", "XTIUSD"
];

const SEGMENTS = [
  { value: 'forex', label: 'Forex', description: 'Currency pairs (EUR/USD, GBP/USD, etc.)' },
  { value: 'crypto', label: 'Crypto', description: 'Cryptocurrencies (BTC, ETH, etc.)' },
  { value: 'commodities', label: 'Commodities', description: 'Gold, Silver, Oil, etc.' },
  { value: 'indices', label: 'Indices', description: 'US30, US100, DE40, etc.' },
  { value: 'stocks', label: 'Stocks', description: 'Individual company stocks' },
];

export default function TradingSettingsPage() {
  const [settings, setSettings] = useState<TradingSettings>({
    globalSpreadPips: 2,
    globalChargeType: 'per_lot',
    globalChargeAmount: 5,
    globalMinCharge: 0.5,
    globalMaxCharge: 0,
    instrumentSpreads: [],
    segmentCharges: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/trading-settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          globalSpreadPips: data.settings.globalSpreadPips || 2,
          globalChargeType: data.settings.globalChargeType || 'per_lot',
          globalChargeAmount: data.settings.globalChargeAmount || 5,
          globalMinCharge: data.settings.globalMinCharge || 0.5,
          globalMaxCharge: data.settings.globalMaxCharge || 0,
          instrumentSpreads: data.settings.instrumentSpreads || [],
          segmentCharges: data.settings.segmentCharges || [],
        });
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/trading-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addInstrumentSpread = () => {
    if (!newSymbol) return;
    const symbol = newSymbol.toUpperCase();
    if (settings.instrumentSpreads.some(s => s.symbol === symbol)) {
      toast.error('Symbol already exists');
      return;
    }
    setSettings({
      ...settings,
      instrumentSpreads: [
        ...settings.instrumentSpreads,
        { symbol, spreadPips: settings.globalSpreadPips, enabled: true }
      ],
    });
    setNewSymbol("");
  };

  const updateInstrumentSpread = (index: number, field: string, value: any) => {
    const updated = [...settings.instrumentSpreads];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, instrumentSpreads: updated });
  };

  const removeInstrumentSpread = (index: number) => {
    setSettings({
      ...settings,
      instrumentSpreads: settings.instrumentSpreads.filter((_, i) => i !== index),
    });
  };

  const addSegmentCharge = (segment: string) => {
    if (settings.segmentCharges.some(s => s.segment === segment)) {
      toast.error('Segment already configured');
      return;
    }
    setSettings({
      ...settings,
      segmentCharges: [
        ...settings.segmentCharges,
        {
          segment,
          chargeType: 'per_lot',
          chargeAmount: settings.globalChargeAmount,
          minCharge: settings.globalMinCharge,
          maxCharge: settings.globalMaxCharge,
          enabled: true
        }
      ],
    });
  };

  const updateSegmentCharge = (index: number, field: string, value: any) => {
    const updated = [...settings.segmentCharges];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, segmentCharges: updated });
  };

  const removeSegmentCharge = (index: number) => {
    setSettings({
      ...settings,
      segmentCharges: settings.segmentCharges.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trading Settings</h1>
            <p className="text-muted-foreground">Configure spreads and trading charges</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Global Spread Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Global Spread Settings
            </CardTitle>
            <CardDescription>
              Default spread applied to all instruments (can be overridden per instrument)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Spread (Pips)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.globalSpreadPips}
                  onChange={(e) => setSettings({ ...settings, globalSpreadPips: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  This spread will be added to market price for all instruments without custom spread
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Charges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Trading Charges (Commission)
            </CardTitle>
            <CardDescription>
              Configure how trading charges are calculated and deducted from trades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Charge Type</Label>
                <Select
                  value={settings.globalChargeType}
                  onValueChange={(value: any) => setSettings({ ...settings, globalChargeType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_lot">Per Lot</SelectItem>
                    <SelectItem value="per_execution">Per Execution</SelectItem>
                    <SelectItem value="percentage">Percentage of Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {settings.globalChargeType === 'percentage' ? 'Charge (%)' : 'Charge Amount ($)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.globalChargeAmount}
                  onChange={(e) => setSettings({ ...settings, globalChargeAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Charge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.globalMinCharge}
                  onChange={(e) => setSettings({ ...settings, globalMinCharge: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Charge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.globalMaxCharge}
                  onChange={(e) => setSettings({ ...settings, globalMaxCharge: parseFloat(e.target.value) || 0 })}
                  placeholder="0 = No limit"
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Charge Calculation Example:</h4>
              <p className="text-sm text-muted-foreground">
                {settings.globalChargeType === 'per_lot' && (
                  <>For a 0.5 lot trade: 0.5 × ${settings.globalChargeAmount} = ${(0.5 * settings.globalChargeAmount).toFixed(2)} charge</>
                )}
                {settings.globalChargeType === 'per_execution' && (
                  <>For any trade: ${settings.globalChargeAmount} fixed charge per execution</>
                )}
                {settings.globalChargeType === 'percentage' && (
                  <>For a $10,000 trade value: {settings.globalChargeAmount}% = ${(10000 * settings.globalChargeAmount / 100).toFixed(2)} charge</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Segment-wise Trade Charges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Segment-wise Trade Charges
            </CardTitle>
            <CardDescription>
              Configure different trade charges for each market segment (overrides global charges)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add segment buttons */}
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.filter(s => !settings.segmentCharges.some(sc => sc.segment === s.value)).map(segment => (
                <Button
                  key={segment.value}
                  variant="outline"
                  size="sm"
                  onClick={() => addSegmentCharge(segment.value)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {segment.label}
                </Button>
              ))}
            </div>

            {/* Segment charges list */}
            {settings.segmentCharges.length > 0 ? (
              <div className="space-y-4">
                {settings.segmentCharges.map((charge, index) => {
                  const segmentInfo = SEGMENTS.find(s => s.value === charge.segment);
                  return (
                    <div key={charge.segment} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={charge.enabled}
                            onCheckedChange={(checked) => updateSegmentCharge(index, 'enabled', checked)}
                          />
                          <div>
                            <h4 className="font-medium">{segmentInfo?.label || charge.segment}</h4>
                            <p className="text-xs text-muted-foreground">{segmentInfo?.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSegmentCharge(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Charge Type</Label>
                          <Select
                            value={charge.chargeType}
                            onValueChange={(value: any) => updateSegmentCharge(index, 'chargeType', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_lot">Per Lot</SelectItem>
                              <SelectItem value="per_execution">Per Execution</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {charge.chargeType === 'percentage' ? 'Charge (%)' : 'Amount ($)'}
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={charge.chargeAmount}
                            onChange={(e) => updateSegmentCharge(index, 'chargeAmount', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Min Charge ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={charge.minCharge}
                            onChange={(e) => updateSegmentCharge(index, 'minCharge', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Max Charge ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={charge.maxCharge}
                            onChange={(e) => updateSegmentCharge(index, 'maxCharge', parseFloat(e.target.value) || 0)}
                            className="h-9"
                            placeholder="0 = No limit"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No segment-specific charges configured.</p>
                <p className="text-sm">Click a segment button above to add custom charges for that market.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-Instrument Spreads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Per-Instrument Spread Overrides
            </CardTitle>
            <CardDescription>
              Set custom spreads for specific instruments (overrides global spread)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new instrument */}
            <div className="flex gap-2">
              <Select value={newSymbol} onValueChange={setNewSymbol}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>
                <SelectContent>
                  {defaultInstruments
                    .filter(s => !settings.instrumentSpreads.some(is => is.symbol === s))
                    .map(symbol => (
                      <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={addInstrumentSpread} disabled={!newSymbol}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Instrument spreads table */}
            {settings.instrumentSpreads.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Symbol</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Spread (Pips)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Enabled</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.instrumentSpreads.map((spread, index) => (
                      <tr key={spread.symbol} className="border-t">
                        <td className="px-4 py-3 font-medium">{spread.symbol}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.1"
                            value={spread.spreadPips}
                            onChange={(e) => updateInstrumentSpread(index, 'spreadPips', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={spread.enabled}
                            onCheckedChange={(checked) => updateInstrumentSpread(index, 'enabled', checked)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInstrumentSpread(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No custom instrument spreads configured. Global spread will be used for all instruments.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <h4 className="font-medium text-blue-500 mb-2">How Spreads & Charges Work</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Spread:</strong> Added to the market price when users buy (ASK = Market + Spread)</li>
              <li>• <strong>Spread:</strong> Subtracted from market price when users sell (BID = Market - Spread)</li>
              <li>• <strong>Charges:</strong> Deducted from user's account balance when trade is executed</li>
              <li>• <strong>Income:</strong> Both spread profit and charges are tracked as broker income</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

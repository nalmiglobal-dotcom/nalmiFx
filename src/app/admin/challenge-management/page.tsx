"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { 
  Trophy, 
  Settings, 
  Users, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Plus,
  Trash2,
  Wallet,
  Target,
  AlertTriangle,
  Zap,
  Scale,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

interface PhaseConfig {
  phase: number;
  name: string;
  profitTarget: number;
  minTradingDays: number;
  tradingPeriodDays: number;
}

interface ChallengeType {
  id: string;
  name: string;
  description: string;
  phases: PhaseConfig[];
  price: number;
  enabled: boolean;
}

interface PayoutOption {
  id: string;
  name: string;
  profitSplit: number;
  frequency: string;
  minPayout: number;
  consistencyRequired: boolean;
  consistencyScore: number;
}

interface ScalingPlan {
  payoutsRequired: number;
  profitRequired: number;
  scalePercentage: number;
  maxScale: number;
}

interface ChallengeSettings {
  challengeTypes: ChallengeType[];
  accountSizePrices: { size: number; price: number }[];
  maxDailyLoss: number;
  maxTotalLoss: number;
  maxSingleTradeLoss: number;
  payoutOptions: PayoutOption[];
  defaultPayoutOption: string;
  scalingEnabled: boolean;
  scalingPlan: ScalingPlan[];
  inactivityDays: number;
  newsTrading: boolean;
  weekendHolding: boolean;
  refundOnPass: boolean;
  refundPercentage: number;
}

interface PhaseProgress {
  phase: number;
  name: string;
  profitTarget: number;
  profitAchieved: number;
  profitPercent: number;
  tradingDays: number;
  minTradingDays: number;
  status: string;
}

interface ChallengeAccount {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    userId: number;
  };
  challengeType: string;
  accountSize: number;
  price: number;
  status: string;
  currentPhase: number;
  totalPhases: number;
  phaseProgress: PhaseProgress[];
  accountNumber: string;
  initialBalance: number;
  currentBalance: number;
  totalProfitPercent: number;
  tradingDaysCount: number;
  tradesCount: number;
  winRate: number;
  consistencyScore: number;
  payoutsCount: number;
  totalPayouts: number;
  payoutHistory: {
    payoutId: string;
    amount: number;
    profitSplit: number;
    payoutOption: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    requestedAt: Date;
    processedAt?: Date;
    transactionId?: string;
  }[];
  breachReason?: string;
  createdAt: string;
  fundedDate?: string;
}

interface Stats {
  totalChallenges: number;
  evaluationChallenges: number;
  fundedChallenges: number;
  breachedChallenges: number;
  totalRevenue: number;
  totalPayouts: number;
}

export default function ChallengeManagementPage() {
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeAccount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("challenge-types");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchSettings();
    fetchChallenges();
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [filterStatus]);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      const res = await fetch('/api/admin/challenge-settings', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // Ensure all arrays have defaults to prevent undefined.map() errors
        const s = data.settings;
        setSettings({
          challengeTypes: s.challengeTypes || [],
          accountSizePrices: s.accountSizePrices || [],
          maxDailyLoss: s.maxDailyLoss ?? 5,
          maxTotalLoss: s.maxTotalLoss ?? 10,
          maxSingleTradeLoss: s.maxSingleTradeLoss ?? 3,
          payoutOptions: s.payoutOptions || [],
          defaultPayoutOption: s.defaultPayoutOption || 'bi_weekly',
          scalingEnabled: s.scalingEnabled ?? true,
          scalingPlan: s.scalingPlan || [],
          inactivityDays: s.inactivityDays ?? 30,
          newsTrading: s.newsTrading ?? false,
          weekendHolding: s.weekendHolding ?? false,
          refundOnPass: s.refundOnPass ?? true,
          refundPercentage: s.refundPercentage ?? 100,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error(error);
      setSettingsError('Failed to fetch settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await fetch(`/api/admin/challenge-accounts?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setChallenges(data.challenges || []);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error('Failed to fetch challenges');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/challenge-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  const updateChallengeStatus = async (challengeId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/challenge-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ challengeId, status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChallenges();
        toast.success('Challenge status updated successfully');
      } else {
        toast.error(data.message || 'Failed to update challenge status');
      }
    } catch (error) {
      toast.error('Error updating challenge status');
    }
  };

  const approvePayout = async (challengeId: string, payoutId: string) => {
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ challengeId, payoutId, action: 'approve' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChallenges();
        toast.success('Payout approved and credited to wallet');
      } else {
        toast.error(data.message || 'Failed to approve payout');
      }
    } catch (error) {
      toast.error('Error approving payout');
    }
  };

  const rejectPayout = async (challengeId: string, payoutId: string) => {
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ challengeId, payoutId, action: 'reject' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChallenges();
        toast.success('Payout rejected');
      } else {
        toast.error(data.message || 'Failed to reject payout');
      }
    } catch (error) {
      toast.error('Error rejecting payout');
    }
  };

  const resetToDefaults = () => {
    const defaultSettings: ChallengeSettings = {
      challengeTypes: [
        {
          id: 'two_step',
          name: 'Two Step Challenge',
          description: 'Classic evaluation: Phase 1 (8% target) → Phase 2 (5% target) → Funded',
          phases: [
            { phase: 1, name: 'Student Phase', profitTarget: 8, minTradingDays: 3, tradingPeriodDays: 0 },
            { phase: 2, name: 'Practitioner Phase', profitTarget: 5, minTradingDays: 3, tradingPeriodDays: 0 },
          ],
          price: 0,
          enabled: true,
        },
        {
          id: 'one_step',
          name: 'One Step Challenge',
          description: 'Fast track: Single phase (10% target) → Funded',
          phases: [
            { phase: 1, name: 'Evaluation Phase', profitTarget: 10, minTradingDays: 3, tradingPeriodDays: 0 },
          ],
          price: 50,
          enabled: true,
        },
        {
          id: 'instant',
          name: 'Instant Funding',
          description: 'Skip evaluation and get funded immediately with stricter rules',
          phases: [],
          price: 200,
          enabled: true,
        },
      ],
      accountSizePrices: [
        { size: 5000, price: 49 },
        { size: 10000, price: 99 },
        { size: 25000, price: 199 },
        { size: 50000, price: 299 },
        { size: 100000, price: 529 },
        { size: 200000, price: 999 },
      ],
      maxDailyLoss: 5,
      maxTotalLoss: 10,
      maxSingleTradeLoss: 3,
      payoutOptions: [
        { id: 'on_demand', name: 'On-Demand', profitSplit: 90, frequency: 'on_demand', minPayout: 2, consistencyRequired: true, consistencyScore: 35 },
        { id: 'weekly', name: 'Weekly Payday', profitSplit: 60, frequency: 'weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
        { id: 'bi_weekly', name: 'Bi-Weekly', profitSplit: 80, frequency: 'bi_weekly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
        { id: 'monthly', name: 'Monthly', profitSplit: 100, frequency: 'monthly', minPayout: 1, consistencyRequired: false, consistencyScore: 0 },
      ],
      defaultPayoutOption: 'bi_weekly',
      scalingEnabled: true,
      scalingPlan: [
        { payoutsRequired: 4, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
        { payoutsRequired: 8, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
        { payoutsRequired: 12, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 },
      ],
      inactivityDays: 30,
      newsTrading: true,
      weekendHolding: true,
      refundOnPass: true,
      refundPercentage: 100,
    };
    setSettings(defaultSettings);
    setSettingsError(null);
    toast.success('Default settings loaded. Click Save to apply.');
  };

  const addChallengeType = () => {
    if (!settings) return;
    const newType: ChallengeType = {
      id: `custom_${Date.now()}`,
      name: 'New Challenge',
      description: 'Custom challenge type',
      phases: [{ phase: 1, name: 'Phase 1', profitTarget: 8, minTradingDays: 3, tradingPeriodDays: 0 }],
      price: 0,
      enabled: true,
    };
    setSettings({ ...settings, challengeTypes: [...settings.challengeTypes, newType] });
  };

  const updateChallengeType = (index: number, updates: Partial<ChallengeType>) => {
    if (!settings) return;
    const updated = [...settings.challengeTypes];
    updated[index] = { ...updated[index], ...updates };
    setSettings({ ...settings, challengeTypes: updated });
  };

  const removeChallengeType = (index: number) => {
    if (!settings) return;
    const updated = settings.challengeTypes.filter((_, i) => i !== index);
    setSettings({ ...settings, challengeTypes: updated });
  };

  const addPhase = (typeIndex: number) => {
    if (!settings) return;
    const updated = [...settings.challengeTypes];
    const phases = updated[typeIndex].phases;
    phases.push({
      phase: phases.length + 1,
      name: `Phase ${phases.length + 1}`,
      profitTarget: 5,
      minTradingDays: 3,
      tradingPeriodDays: 0,
    });
    setSettings({ ...settings, challengeTypes: updated });
  };

  const removePhase = (typeIndex: number, phaseIndex: number) => {
    if (!settings) return;
    const updated = [...settings.challengeTypes];
    updated[typeIndex].phases = updated[typeIndex].phases.filter((_, i) => i !== phaseIndex);
    setSettings({ ...settings, challengeTypes: updated });
  };

  const addAccountSize = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      accountSizePrices: [...settings.accountSizePrices, { size: 0, price: 0 }],
    });
  };

  const removeAccountSize = (index: number) => {
    if (!settings) return;
    const updated = settings.accountSizePrices.filter((_, i) => i !== index);
    setSettings({ ...settings, accountSizePrices: updated });
  };

  const addPayoutOption = () => {
    if (!settings) return;
    const newOption: PayoutOption = {
      id: `payout_${Date.now()}`,
      name: 'New Payout',
      profitSplit: 80,
      frequency: 'bi_weekly',
      minPayout: 1,
      consistencyRequired: false,
      consistencyScore: 0,
    };
    setSettings({ ...settings, payoutOptions: [...settings.payoutOptions, newOption] });
  };

  const removePayoutOption = (index: number) => {
    if (!settings) return;
    const updated = settings.payoutOptions.filter((_, i) => i !== index);
    setSettings({ ...settings, payoutOptions: updated });
  };

  const addScalingLevel = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      scalingPlan: [...settings.scalingPlan, { payoutsRequired: 4, profitRequired: 10, scalePercentage: 25, maxScale: 2000000 }],
    });
  };

  const removeScalingLevel = (index: number) => {
    if (!settings) return;
    const updated = settings.scalingPlan.filter((_, i) => i !== index);
    setSettings({ ...settings, scalingPlan: updated });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'evaluation': return <Badge className="bg-blue-500/20 text-blue-500">Evaluation</Badge>;
      case 'funded': return <Badge className="bg-green-500/20 text-green-500">Funded</Badge>;
      case 'breached': return <Badge className="bg-red-500/20 text-red-500">Breached</Badge>;
      case 'expired': return <Badge variant="secondary">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChallengeTypeName = (typeId: string) => {
    if (!settings) return typeId;
    const type = settings.challengeTypes.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Prop Firm Challenge Management</h1>
              <p className="text-muted-foreground mt-1">Configure challenge types, phases, payouts, and risk rules</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetToDefaults} variant="outline">
                <Zap className="w-4 h-4 mr-2" /> Reset to Defaults
              </Button>
              <Button onClick={saveSettings} disabled={saving || !settings}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{stats.totalChallenges}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Evaluation</p>
                      <p className="text-xl font-bold">{stats.evaluationChallenges}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Funded</p>
                      <p className="text-xl font-bold">{stats.fundedChallenges}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Breached</p>
                      <p className="text-xl font-bold">{stats.breachedChallenges}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold">${stats.totalRevenue?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payouts</p>
                      <p className="text-xl font-bold">${stats.totalPayouts?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="challenge-types"><Trophy className="w-4 h-4 mr-2" />Challenge Types</TabsTrigger>
              <TabsTrigger value="pricing"><DollarSign className="w-4 h-4 mr-2" />Pricing</TabsTrigger>
              <TabsTrigger value="risk-rules"><AlertTriangle className="w-4 h-4 mr-2" />Risk Rules</TabsTrigger>
              <TabsTrigger value="scaling"><Scale className="w-4 h-4 mr-2" />Scaling</TabsTrigger>
              <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Traders</TabsTrigger>
            </TabsList>

            {settingsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
            ) : settingsError ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-destructive">{settingsError}</p>
                <Button onClick={resetToDefaults} variant="outline">
                  <Zap className="w-4 h-4 mr-2" /> Load Default Settings
                </Button>
              </div>
            ) : !settings || settings.challengeTypes.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No challenge settings found. Click below to load default prop firm settings.</p>
                <Button onClick={resetToDefaults}>
                  <Zap className="w-4 h-4 mr-2" /> Load Default Settings
                </Button>
              </div>
            ) : settings ? (
              <>
                {/* Challenge Types Tab */}
                <TabsContent value="challenge-types" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Challenge Types & Phases</h2>
                    <Button onClick={addChallengeType} size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Add Challenge Type
                    </Button>
                  </div>

                  {settings.challengeTypes.map((type, typeIndex) => (
                    <Card key={type.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={type.enabled}
                              onCheckedChange={(checked) => updateChallengeType(typeIndex, { enabled: checked })}
                            />
                            <div>
                              <Input
                                value={type.name}
                                onChange={(e) => updateChallengeType(typeIndex, { name: e.target.value })}
                                className="font-semibold text-lg h-8 w-64"
                              />
                              <Input
                                value={type.description}
                                onChange={(e) => updateChallengeType(typeIndex, { description: e.target.value })}
                                className="text-sm text-muted-foreground mt-1 h-7"
                                placeholder="Description"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div>
                              <Label className="text-xs">Price Modifier ($)</Label>
                              <Input
                                type="number"
                                value={type.price}
                                onChange={(e) => updateChallengeType(typeIndex, { price: parseFloat(e.target.value) || 0 })}
                                className="w-24 h-8"
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeChallengeType(typeIndex)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="font-medium">Evaluation Phases</Label>
                          <Button size="sm" variant="outline" onClick={() => addPhase(typeIndex)}>
                            <Plus className="w-3 h-3 mr-1" /> Add Phase
                          </Button>
                        </div>
                        {type.phases.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No phases = Instant Funding</p>
                        ) : (
                          <div className="space-y-2">
                            {type.phases.map((phase, phaseIndex) => (
                              <div key={phaseIndex} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                <Badge variant="outline">Phase {phase.phase}</Badge>
                                <Input
                                  value={phase.name}
                                  onChange={(e) => {
                                    const updated = [...settings.challengeTypes];
                                    updated[typeIndex].phases[phaseIndex].name = e.target.value;
                                    setSettings({ ...settings, challengeTypes: updated });
                                  }}
                                  className="w-40 h-8"
                                  placeholder="Phase Name"
                                />
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs">Target:</Label>
                                  <Input
                                    type="number"
                                    value={phase.profitTarget}
                                    onChange={(e) => {
                                      const updated = [...settings.challengeTypes];
                                      updated[typeIndex].phases[phaseIndex].profitTarget = parseFloat(e.target.value) || 0;
                                      setSettings({ ...settings, challengeTypes: updated });
                                    }}
                                    className="w-16 h-8"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs">Min Days:</Label>
                                  <Input
                                    type="number"
                                    value={phase.minTradingDays}
                                    onChange={(e) => {
                                      const updated = [...settings.challengeTypes];
                                      updated[typeIndex].phases[phaseIndex].minTradingDays = parseInt(e.target.value) || 0;
                                      setSettings({ ...settings, challengeTypes: updated });
                                    }}
                                    className="w-16 h-8"
                                  />
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removePhase(typeIndex, phaseIndex)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Account Size Pricing</CardTitle>
                      <Button size="sm" onClick={addAccountSize}>
                        <Plus className="w-4 h-4 mr-1" /> Add Size
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {settings.accountSizePrices.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                            <div className="flex-1">
                              <Label className="text-xs">Account Size ($)</Label>
                              <Input
                                type="number"
                                value={item.size}
                                onChange={(e) => {
                                  const updated = [...settings.accountSizePrices];
                                  updated[index].size = parseFloat(e.target.value) || 0;
                                  setSettings({ ...settings, accountSizePrices: updated });
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Price ($)</Label>
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                  const updated = [...settings.accountSizePrices];
                                  updated[index].price = parseFloat(e.target.value) || 0;
                                  setSettings({ ...settings, accountSizePrices: updated });
                                }}
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="mt-5 text-destructive" onClick={() => removeAccountSize(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Risk Rules Tab */}
                <TabsContent value="risk-rules" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Management Rules</CardTitle>
                      <CardDescription>Configure drawdown limits and trading restrictions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label>Max Daily Loss (%)</Label>
                          <Input
                            type="number"
                            value={settings.maxDailyLoss}
                            onChange={(e) => setSettings({ ...settings, maxDailyLoss: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Daily drawdown limit based on higher of balance/equity</p>
                        </div>
                        <div>
                          <Label>Max Total Loss (%)</Label>
                          <Input
                            type="number"
                            value={settings.maxTotalLoss}
                            onChange={(e) => setSettings({ ...settings, maxTotalLoss: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Maximum drawdown from initial balance</p>
                        </div>
                        <div>
                          <Label>Max Single Trade Loss (%)</Label>
                          <Input
                            type="number"
                            value={settings.maxSingleTradeLoss}
                            onChange={(e) => setSettings({ ...settings, maxSingleTradeLoss: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">For funded accounts only</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Trading Restrictions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <Label>Inactivity Days</Label>
                            <Input
                              type="number"
                              value={settings.inactivityDays}
                              onChange={(e) => setSettings({ ...settings, inactivityDays: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Days before account breach due to inactivity</p>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <Label>News Trading</Label>
                              <p className="text-xs text-muted-foreground">Allow trading during news events</p>
                            </div>
                            <Switch
                              checked={settings.newsTrading}
                              onCheckedChange={(checked) => setSettings({ ...settings, newsTrading: checked })}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <Label>Weekend Holding</Label>
                              <p className="text-xs text-muted-foreground">Allow holding positions over weekend</p>
                            </div>
                            <Switch
                              checked={settings.weekendHolding}
                              onCheckedChange={(checked) => setSettings({ ...settings, weekendHolding: checked })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Refund Policy</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <Label>Refund on Pass</Label>
                              <p className="text-xs text-muted-foreground">Refund challenge fee when trader passes</p>
                            </div>
                            <Switch
                              checked={settings.refundOnPass}
                              onCheckedChange={(checked) => setSettings({ ...settings, refundOnPass: checked })}
                            />
                          </div>
                          <div>
                            <Label>Refund Percentage (%)</Label>
                            <Input
                              type="number"
                              value={settings.refundPercentage}
                              onChange={(e) => setSettings({ ...settings, refundPercentage: parseFloat(e.target.value) || 0 })}
                              disabled={!settings.refundOnPass}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payouts Tab */}
                <TabsContent value="payouts" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Payout Options</CardTitle>
                        <CardDescription>Configure profit split and payout frequencies</CardDescription>
                      </div>
                      <Button size="sm" onClick={addPayoutOption}>
                        <Plus className="w-4 h-4 mr-1" /> Add Option
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="mb-4">
                        <Label>Default Payout Option</Label>
                        <Select
                          value={settings.defaultPayoutOption}
                          onValueChange={(value) => setSettings({ ...settings, defaultPayoutOption: value })}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.payoutOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {settings.payoutOptions.map((option, index) => (
                        <div key={option.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Input
                              value={option.name}
                              onChange={(e) => {
                                const updated = [...settings.payoutOptions];
                                updated[index].name = e.target.value;
                                setSettings({ ...settings, payoutOptions: updated });
                              }}
                              className="font-medium w-48"
                            />
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePayoutOption(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Profit Split (%)</Label>
                              <Input
                                type="number"
                                value={option.profitSplit}
                                onChange={(e) => {
                                  const updated = [...settings.payoutOptions];
                                  updated[index].profitSplit = parseFloat(e.target.value) || 0;
                                  setSettings({ ...settings, payoutOptions: updated });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Frequency</Label>
                              <Select
                                value={option.frequency}
                                onValueChange={(value) => {
                                  const updated = [...settings.payoutOptions];
                                  updated[index].frequency = value;
                                  setSettings({ ...settings, payoutOptions: updated });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="on_demand">On-Demand</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Min Payout (%)</Label>
                              <Input
                                type="number"
                                value={option.minPayout}
                                onChange={(e) => {
                                  const updated = [...settings.payoutOptions];
                                  updated[index].minPayout = parseFloat(e.target.value) || 0;
                                  setSettings({ ...settings, payoutOptions: updated });
                                }}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={option.consistencyRequired}
                                  onCheckedChange={(checked) => {
                                    const updated = [...settings.payoutOptions];
                                    updated[index].consistencyRequired = checked;
                                    setSettings({ ...settings, payoutOptions: updated });
                                  }}
                                />
                                <Label className="text-xs">Consistency Required</Label>
                              </div>
                            </div>
                          </div>
                          {option.consistencyRequired && (
                            <div className="w-48">
                              <Label className="text-xs">Required Consistency Score (%)</Label>
                              <Input
                                type="number"
                                value={option.consistencyScore}
                                onChange={(e) => {
                                  const updated = [...settings.payoutOptions];
                                  updated[index].consistencyScore = parseFloat(e.target.value) || 0;
                                  setSettings({ ...settings, payoutOptions: updated });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Scaling Tab */}
                <TabsContent value="scaling" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Account Scaling Plan</CardTitle>
                        <CardDescription>Reward consistent traders with account size increases</CardDescription>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={settings.scalingEnabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, scalingEnabled: checked })}
                          />
                          <Label>Enable Scaling</Label>
                        </div>
                        <Button size="sm" onClick={addScalingLevel} disabled={!settings.scalingEnabled}>
                          <Plus className="w-4 h-4 mr-1" /> Add Level
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!settings.scalingEnabled ? (
                        <p className="text-muted-foreground text-center py-4">Scaling is disabled</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Level</TableHead>
                              <TableHead>Payouts Required</TableHead>
                              <TableHead>Profit Required (%)</TableHead>
                              <TableHead>Scale Increase (%)</TableHead>
                              <TableHead>Max Account Size ($)</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settings.scalingPlan.map((level, index) => (
                              <TableRow key={index}>
                                <TableCell><Badge>Level {index + 1}</Badge></TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={level.payoutsRequired}
                                    onChange={(e) => {
                                      const updated = [...settings.scalingPlan];
                                      updated[index].payoutsRequired = parseInt(e.target.value) || 0;
                                      setSettings({ ...settings, scalingPlan: updated });
                                    }}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={level.profitRequired}
                                    onChange={(e) => {
                                      const updated = [...settings.scalingPlan];
                                      updated[index].profitRequired = parseFloat(e.target.value) || 0;
                                      setSettings({ ...settings, scalingPlan: updated });
                                    }}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={level.scalePercentage}
                                    onChange={(e) => {
                                      const updated = [...settings.scalingPlan];
                                      updated[index].scalePercentage = parseFloat(e.target.value) || 0;
                                      setSettings({ ...settings, scalingPlan: updated });
                                    }}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={level.maxScale}
                                    onChange={(e) => {
                                      const updated = [...settings.scalingPlan];
                                      updated[index].maxScale = parseFloat(e.target.value) || 0;
                                      setSettings({ ...settings, scalingPlan: updated });
                                    }}
                                    className="w-32"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeScalingLevel(index)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Traders Tab */}
                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle>Challenge Traders</CardTitle>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="evaluation">Evaluation</SelectItem>
                            <SelectItem value="funded">Funded</SelectItem>
                            <SelectItem value="breached">Breached</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Trader</TableHead>
                              <TableHead>Account</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Phase</TableHead>
                              <TableHead>Progress</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                              </TableRow>
                            ) : challenges.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No challenges found</TableCell>
                              </TableRow>
                            ) : (
                              challenges.map((challenge) => (
                                <TableRow key={challenge._id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{challenge.userId?.name || 'Unknown'}</p>
                                      <p className="text-xs text-muted-foreground">{challenge.userId?.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{challenge.accountNumber}</TableCell>
                                  <TableCell>{getChallengeTypeName(challenge.challengeType)}</TableCell>
                                  <TableCell>${challenge.accountSize?.toLocaleString()}</TableCell>
                                  <TableCell>
                                    {challenge.totalPhases > 0 ? (
                                      <Badge variant="outline">
                                        {challenge.currentPhase}/{challenge.totalPhases}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-500/20 text-green-500">Funded</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className={challenge.totalProfitPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                                        {challenge.totalProfitPercent >= 0 ? '+' : ''}{challenge.totalProfitPercent?.toFixed(2) || 0}%
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        ${challenge.currentBalance?.toLocaleString() || 0}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(challenge.status)}
                                    {challenge.breachReason && (
                                      <p className="text-xs text-red-500 mt-1">{challenge.breachReason}</p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {challenge.status === 'evaluation' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-500 h-7 px-2"
                                            onClick={() => updateChallengeStatus(challenge._id, 'funded')}
                                            title="Mark as Funded"
                                          >
                                            <CheckCircle className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-500 h-7 px-2"
                                            onClick={() => updateChallengeStatus(challenge._id, 'breached')}
                                            title="Mark as Breached"
                                          >
                                            <XCircle className="w-3 h-3" />
                                          </Button>
                                        </>
                                      )}
                                      {challenge.status === 'funded' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-500 h-7 px-2"
                                          onClick={() => updateChallengeStatus(challenge._id, 'breached')}
                                          title="Mark as Breached"
                                        >
                                          <XCircle className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            ) : null}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

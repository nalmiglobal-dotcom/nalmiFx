"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Settings2, Check, Target, Zap, Trophy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface PhaseConfig {
  phase: number;
  name: string;
  profitTarget: number;
  minTradingDays: number;
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
}

interface ChallengeSettings {
  challengeTypes: ChallengeType[];
  accountSizePrices: { size: number; price: number }[];
  payoutOptions: PayoutOption[];
  defaultPayoutOption: string;
  maxDailyLoss: number;
  maxTotalLoss: number;
  maxSingleTradeLoss: number;
  inactivityDays: number;
  newsTrading: boolean;
  weekendHolding: boolean;
  refundOnPass: boolean;
  refundPercentage: number;
}

export default function BuyChallengePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [selectedType, setSelectedType] = useState('two_step');
  const [selectedPayout, setSelectedPayout] = useState('bi_weekly');
  const [selectedSize, setSelectedSize] = useState(100000);
  const [couponCode, setCouponCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/challenge-settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        // Set defaults
        if (data.settings.accountSizePrices?.length > 0) {
          setSelectedSize(data.settings.accountSizePrices[0].size);
        }
        if (data.settings.challengeTypes?.length > 0) {
          const enabledType = data.settings.challengeTypes.find((t: ChallengeType) => t.enabled);
          if (enabledType) setSelectedType(enabledType.id);
        }
        if (data.settings.defaultPayoutOption) {
          setSelectedPayout(data.settings.defaultPayoutOption);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedChallengeType = (): ChallengeType | undefined => {
    return settings?.challengeTypes?.find(t => t.id === selectedType);
  };

  const getBasePrice = () => {
    if (!settings) return 0;
    const sizeOption = settings.accountSizePrices?.find(s => s.size === selectedSize);
    return sizeOption?.price || 0;
  };

  const getTypePrice = () => {
    const type = getSelectedChallengeType();
    return type?.price || 0;
  };

  const getTotalPrice = () => {
    return getBasePrice() + getTypePrice();
  };

  const getChallengeName = () => {
    const type = getSelectedChallengeType();
    return type?.name || 'Challenge';
  };

  const getFirstPhaseTarget = () => {
    const type = getSelectedChallengeType();
    if (!type || !type.phases || type.phases.length === 0) return 0;
    return type.phases[0].profitTarget;
  };

  const getTargetProfit = () => {
    return (selectedSize * getFirstPhaseTarget()) / 100;
  };

  const getTargetBalance = () => {
    return selectedSize + getTargetProfit();
  };

  const getSelectedPayout = () => {
    return settings?.payoutOptions?.find(p => p.id === selectedPayout);
  };

  const handlePurchase = async () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/user/challenges/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challengeType: selectedType,
          accountSize: selectedSize,
          price: getTotalPrice(),
          payoutOption: selectedPayout,
          couponCode: couponCode || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Challenge purchased successfully!');
        router.push('/challenge-dashboard');
      } else {
        toast.error(data.message || 'Failed to purchase challenge');
      }
    } catch (error) {
      toast.error('Failed to process purchase');
    } finally {
      setProcessing(false);
    }
  };

  const selectedChallengeType = getSelectedChallengeType();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">New Challenge</h1>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Challenge Type */}
                  <div>
                    <h3 className="font-semibold mb-1">Challenge Type</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose the type of challenge you want to take</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(settings?.challengeTypes || []).filter(t => t.enabled).map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedType === type.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedType === type.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedType === type.id && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                          {type.phases.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs">
                              {type.phases.map((phase, idx) => (
                                <span key={idx} className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">{phase.profitTarget}%</Badge>
                                  {idx < type.phases.length - 1 && <ArrowRight className="w-3 h-3" />}
                                </span>
                              ))}
                              <ArrowRight className="w-3 h-3" />
                              <Badge className="bg-green-500/20 text-green-500 text-xs">Funded</Badge>
                            </div>
                          )}
                          {type.phases.length === 0 && (
                            <Badge className="mt-2 bg-amber-500/20 text-amber-500 text-xs">
                              <Zap className="w-3 h-3 mr-1" />Instant Funding
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phase Details */}
                  {selectedChallengeType && selectedChallengeType.phases.length > 0 && (
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2 bg-muted rounded-lg">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Evaluation Phases</h3>
                            <p className="text-sm text-muted-foreground">Complete these phases to get funded</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {selectedChallengeType.phases.map((phase, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">Phase {phase.phase}</Badge>
                                <span className="font-medium">{phase.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right">
                                  <p className="text-muted-foreground">Target</p>
                                  <p className="font-semibold text-green-500">{phase.profitTarget}%</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground">Min Days</p>
                                  <p className="font-semibold">{phase.minTradingDays}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Trading Rules */}
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Trading Rules</h3>
                          <p className="text-sm text-muted-foreground">Risk management rules for this challenge</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 rounded-lg border bg-background">
                          <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                          <p className="font-semibold text-red-500">{settings?.maxDailyLoss || 5}%</p>
                        </div>
                        <div className="p-3 rounded-lg border bg-background">
                          <p className="text-xs text-muted-foreground">Max Total Loss</p>
                          <p className="font-semibold text-red-500">{settings?.maxTotalLoss || 10}%</p>
                        </div>
                        <div className="p-3 rounded-lg border bg-background">
                          <p className="text-xs text-muted-foreground">News Trading</p>
                          <p className="font-semibold">{settings?.newsTrading ? 'Allowed' : 'Not Allowed'}</p>
                        </div>
                        <div className="p-3 rounded-lg border bg-background">
                          <p className="text-xs text-muted-foreground">Weekend Holding</p>
                          <p className="font-semibold">{settings?.weekendHolding ? 'Allowed' : 'Not Allowed'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Size */}
                  <div>
                    <h3 className="font-semibold mb-1">Account Size</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose your preferred account size</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {(settings?.accountSizePrices || []).map((sizeOption) => (
                        <button
                          key={sizeOption.size}
                          onClick={() => setSelectedSize(sizeOption.size)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            selectedSize === sizeOption.size
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedSize === sizeOption.size ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedSize === sizeOption.size && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-medium text-sm">${sizeOption.size.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">${sizeOption.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payout Option */}
                  <div>
                    <h3 className="font-semibold mb-1">Payout Option</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose how you want to receive your profits when funded</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(settings?.payoutOptions || []).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedPayout(option.id)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            selectedPayout === option.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedPayout === option.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedPayout === option.id && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-medium text-sm">{option.name}</span>
                          </div>
                          <p className="text-lg font-bold text-green-500 mt-1">{option.profitSplit}%</p>
                          <p className="text-xs text-muted-foreground">profit split</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="space-y-4">
                  {/* Coupon Code */}
                  <div>
                    <h3 className="font-semibold mb-1">Coupon Code</h3>
                    <p className="text-sm text-muted-foreground mb-3">Enter a coupon code to get a discount</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      <Button variant="outline">Apply</Button>
                    </div>
                  </div>

                  {/* Target Card */}
                  {selectedChallengeType && selectedChallengeType.phases.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <Target className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phase 1 Target</p>
                            <p className="text-xl font-bold text-primary">${getTargetBalance().toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Starting Balance</p>
                            <p className="font-semibold">${selectedSize.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit Required</p>
                            <p className="font-semibold text-green-500">+${getTargetProfit().toLocaleString()} ({getFirstPhaseTarget()}%)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payout Info */}
                  {getSelectedPayout() && (
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-1">When Funded</p>
                        <p className="text-lg font-bold text-green-500">{getSelectedPayout()?.profitSplit}% Profit Split</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSelectedPayout()?.frequency === 'on_demand' && 'Request payouts anytime'}
                          {getSelectedPayout()?.frequency === 'weekly' && 'Weekly payouts'}
                          {getSelectedPayout()?.frequency === 'bi_weekly' && 'Bi-weekly payouts'}
                          {getSelectedPayout()?.frequency === 'monthly' && 'Monthly payouts'}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Order Summary Card */}
                  <Card className="bg-card border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">${selectedSize.toLocaleString()} — {getChallengeName()}</p>
                          <p className="text-sm text-muted-foreground">Platform: MetaTrader 5</p>
                        </div>
                        <p className="font-semibold">${getTotalPrice().toFixed(2)}</p>
                      </div>

                      {settings?.refundOnPass && (
                        <div className="p-2 bg-green-500/10 rounded text-xs text-green-600">
                          💰 {settings.refundPercentage}% fee refund when you pass!
                        </div>
                      )}

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total</span>
                          <span className="text-2xl font-bold">${getTotalPrice().toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="terms"
                            checked={agreedToTerms}
                            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                          />
                          <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                            I agree with all the following terms:
                          </Label>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 pl-6">
                          <li>• I have read and agreed to the Terms of Use.</li>
                          <li>• All information provided is correct.</li>
                          <li>• I understand the trading rules and risk limits.</li>
                        </ul>
                      </div>

                      <Button 
                        className="w-full bg-primary hover:bg-primary/90" 
                        size="lg"
                        onClick={handlePurchase}
                        disabled={processing || !agreedToTerms}
                      >
                        {processing ? 'Processing...' : 'Purchase Challenge'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

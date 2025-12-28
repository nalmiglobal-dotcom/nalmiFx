"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { CheckCircle, XCircle, Wallet, Clock, DollarSign } from "lucide-react";

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
  phaseProgress: any[];
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

export default function PayoutManagementPage() {
  const [challenges, setChallenges] = useState<ChallengeAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/challenge-accounts', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      toast.error('Failed to fetch challenges');
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-500">Pending</Badge>;
      case 'approved': return <Badge className="bg-blue-500/20 text-blue-500">Approved</Badge>;
      case 'paid': return <Badge className="bg-green-500/20 text-green-500">Paid</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const fundedChallengesWithPayouts = challenges.filter(c => 
    c.status === 'funded' && c.payoutHistory && c.payoutHistory.length > 0
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Payout Management</h1>
        <p className="text-muted-foreground">Approve or reject payout requests from funded traders</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle>Payout Requests</CardTitle>
          </div>
          <CardDescription>
            Manage payout requests from traders who have completed their challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payout requests...</div>
          ) : fundedChallengesWithPayouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payout requests found</div>
          ) : (
            <div className="space-y-6">
              {fundedChallengesWithPayouts.map((challenge) => (
                <div key={challenge._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium">{challenge.userId?.name || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground">{challenge.userId?.email}</p>
                      <p className="text-sm font-mono">{challenge.accountNumber}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm">Account: ${challenge.accountSize?.toLocaleString()}</span>
                        <span className="text-sm">Profit: ${challenge.currentBalance - challenge.initialBalance}</span>
                      </div>
                    </div>
                    <Badge variant={challenge.status === 'funded' ? 'default' : 'secondary'}>
                      {challenge.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {challenge.payoutHistory.map((payout, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50/50 rounded-r-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium">Payout ID: {payout.payoutId}</p>
                              {getStatusBadge(payout.status)}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Amount</p>
                                <p className="font-medium flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${payout.amount?.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Split</p>
                                <p className="font-medium">{payout.profitSplit}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Option</p>
                                <p className="font-medium">{payout.payoutOption}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Requested</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(payout.requestedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {payout.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-green-600 h-8 px-3"
                                  onClick={() => approvePayout(challenge._id, payout.payoutId)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 h-8 px-3"
                                  onClick={() => rejectPayout(challenge._id, payout.payoutId)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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

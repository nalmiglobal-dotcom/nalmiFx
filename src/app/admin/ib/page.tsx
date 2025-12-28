"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import { Users, DollarSign, Clock, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";

interface IBStats {
  userId: number;
  name: string;
  email: string;
  ib_code: string;
  referredCount: number;
  totalCommission: number;
  ib_commission_rate: number;
}

interface RecentCommission {
  _id: string;
  ib_user_name: string;
  referred_user_name: string;
  commission_amount: number;
  createdAt: string;
}

export default function IBOverviewPage() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    totalIBs: 0,
    totalCommission: 0,
    totalReferred: 0,
  });
  const [topIBs, setTopIBs] = useState<IBStats[]>([]);
  const [recentCommissions, setRecentCommissions] = useState<RecentCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [reqRes, accRes, commRes] = await Promise.all([
        fetch('/api/admin/ib-requests', { credentials: 'include' }),
        fetch('/api/admin/ib/accounts', { credentials: 'include' }),
        fetch('/api/admin/ib/commissions', { credentials: 'include' }),
      ]);
      
      const reqData = await reqRes.json();
      const accData = await accRes.json();
      const commData = await commRes.json();

      const pendingRequests = reqData.success 
        ? (reqData.requests || []).filter((r: any) => r.status === 'pending').length 
        : 0;
      
      const accounts = accData.success ? (accData.accounts || []) : [];
      const totalIBs = accounts.length;
      const totalReferred = accounts.reduce((sum: number, a: any) => sum + (a.referredCount || 0), 0);
      
      // Sort by total commission and take top 5
      const sorted = [...accounts].sort((a: IBStats, b: IBStats) => b.totalCommission - a.totalCommission);
      setTopIBs(sorted.slice(0, 5));
      
      const commissions = commData.success ? (commData.commissions || []) : [];
      const totalCommission = commissions.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0);
      
      // Get recent 5 commissions
      setRecentCommissions(commissions.slice(0, 5));

      setStats({ pendingRequests, totalIBs, totalCommission, totalReferred });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load IB overview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">IB Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Summary of IB program</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IB Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.totalIBs}</div>
            <p className="text-xs text-muted-foreground">Active IBs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referred</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.totalReferred}</div>
            <p className="text-xs text-muted-foreground">Users referred by IBs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${loading ? '…' : stats.totalCommission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Paid to IBs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing IBs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : topIBs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No IB data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IB</TableHead>
                    <TableHead className="text-center">Referred</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topIBs.map((ib) => (
                    <TableRow key={ib.userId}>
                      <TableCell>
                        <div className="font-medium">{ib.name}</div>
                        <div className="text-xs text-muted-foreground">{ib.ib_code}</div>
                      </TableCell>
                      <TableCell className="text-center">{ib.referredCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-green-500">
                          ${ib.totalCommission.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : recentCommissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent commissions</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IB</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCommissions.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium">{c.ib_user_name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.referred_user_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-green-500">
                          ${c.commission_amount.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib-requests'}>
              <Clock className="mr-2 h-4 w-4" /> View Pending Requests
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/accounts'}>
              <Users className="mr-2 h-4 w-4" /> Manage IB Accounts
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/commissions'}>
              <DollarSign className="mr-2 h-4 w-4" /> View Commissions
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/performance'}>
              <TrendingUp className="mr-2 h-4 w-4" /> View Performance
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Settings & Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/tiers'}>
              Tier Management
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/withdrawals'}>
              IB Withdrawals
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/settings'}>
              IB Settings
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => window.location.href = '/admin/ib/dashboard'}>
              IB Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



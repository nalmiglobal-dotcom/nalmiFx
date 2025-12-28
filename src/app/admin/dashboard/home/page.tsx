"use client";

import { TrendingUp, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useState } from "react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalAdmins: number;
  totalBalance: number;
  totalTransactions: number;
  pendingTransactions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  recentUsers: Array<{
    _id: string;
    userId: number;
    name: string;
    email: string;
    balance: number;
    isActive: boolean;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch stats:', data.message);
        // If unauthorized, redirect to admin login
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Overview Dashboard</h1>
        <p className="text-sm text-white/50 mt-1">Welcome to the admin management panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Users</p>
              <p className="text-3xl font-bold text-white mt-2">
                {loading ? '...' : stats?.totalUsers?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-purple-400 mt-2">
                {stats?.activeUsers || 0} active
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Pending Transactions</p>
              <p className="text-3xl font-bold text-white mt-2">
                {loading ? '...' : stats?.pendingTransactions || '0'}
              </p>
              <p className="text-xs text-yellow-400 mt-2">
                {stats?.totalTransactions || 0} total
              </p>
            </div>
            <div className="w-14 h-14 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Deposits</p>
              <p className="text-3xl font-bold text-white mt-2">
                {loading ? '...' : `$${(stats?.totalDeposits || 0).toLocaleString()}`}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-3 h-3 text-green-400" />
                <p className="text-xs text-green-400">All time</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-green-400" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Withdrawals</p>
              <p className="text-3xl font-bold text-white mt-2">
                {loading ? '...' : `$${(stats?.totalWithdrawals || 0).toLocaleString()}`}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowDownRight className="w-3 h-3 text-blue-400" />
                <p className="text-xs text-blue-400">All time</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Users</h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-white/50">Loading...</p>
            ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between py-3 border-b border-[#2a2035] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400 font-medium text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    user.isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50">No users yet</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-[#1a1025] border border-[#2a2035] rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#0f0a1f] rounded-xl">
              <span className="text-sm text-white/60">Total Balance</span>
              <span className="font-semibold text-white">
                ${loading ? '...' : (stats?.totalBalance || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f0a1f] rounded-xl">
              <span className="text-sm text-white/60">Inactive Users</span>
              <span className="font-semibold text-white">{loading ? '...' : stats?.inactiveUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f0a1f] rounded-xl">
              <span className="text-sm text-white/60">Total Admins</span>
              <span className="font-semibold text-white">{loading ? '...' : stats?.totalAdmins || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f0a1f] rounded-xl">
              <span className="text-sm text-white/60">Total Transactions</span>
              <span className="font-semibold text-white">{loading ? '...' : stats?.totalTransactions || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || 'Logged in successfully');
        setForm({ email: "", password: "" });
        await new Promise(resolve => setTimeout(resolve, 200));
        window.location.href = '/admin/dashboard/home';
      } else {
        toast.error(data.message || 'Invalid credentials');
        setForm({ ...form, password: "" });
      }
    } catch (error: any) {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f0a1f]">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#1a1025] to-[#0f0a1f]" />
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white tracking-wider">NalmiFX</h1>
            <a href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/80 text-sm hover:bg-white/5 transition-colors">
              User Login <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 via-transparent to-transparent rounded-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-purple-500/30 to-indigo-600/20 rounded-full blur-3xl" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-8 rounded-full bg-purple-600/20 border border-purple-500/30">
                  <Shield className="w-24 h-24 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-4xl font-light text-white mb-2">Admin Control</h2>
            <h2 className="text-4xl font-light text-white">Center</h2>
            <div className="flex justify-center gap-2 mt-8">
              <div className="w-8 h-1 rounded-full bg-white/30" />
              <div className="w-8 h-1 rounded-full bg-white" />
              <div className="w-8 h-1 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-wider">NalmiFX</h1>
            <p className="text-purple-400 text-sm mt-1">Admin Panel</p>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-4xl font-semibold text-white">Admin Login</h2>
          </div>
          <p className="text-white/50 mb-8">
            Access the administration dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                type="email"
                placeholder="Admin email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-14 bg-[#1a1025] border-[#2a2035] text-white placeholder:text-white/40 rounded-xl focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-14 bg-[#1a1025] border-[#2a2035] text-white placeholder:text-white/40 rounded-xl pr-12 focus:border-purple-500 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in to Admin"}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-[#1a1025] border border-[#2a2035]">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <p className="text-white/80 text-sm font-medium">Secure Access</p>
                <p className="text-white/40 text-xs mt-1">
                  This area is restricted to authorized administrators only. All login attempts are logged.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/login" className="text-white/50 text-sm hover:text-purple-400 transition-colors">
              ← Back to User Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


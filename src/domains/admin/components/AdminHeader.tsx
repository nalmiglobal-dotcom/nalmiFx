"use client";

import { Bell, User, Settings, LogOut, RefreshCw, Key, ChevronDown, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

interface AdminData {
  adminId: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;
  
  const [loading, setLoading] = useState(false);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await fetch("/api/admin/auth/me", {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setAdmin(data.admin);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Logged out successfully");
        router.push("/admin/login");
        router.refresh();
      } else {
        toast.error(data.message || "Failed to logout");
      }
    } catch (error) {
      toast.error("An error occurred during logout");
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password changed successfully");
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || "Failed to change password");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'moderator': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <>
      <header className="h-14 bg-[#1a1025] border-b border-[#2a2035] flex items-center justify-end px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-purple-600/10"
          >
            <Bell className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-purple-600/10"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-purple-600/10"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Account Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="ghost" 
              className="h-10 px-3 rounded-xl text-white/60 hover:text-white hover:bg-purple-600/10 flex items-center gap-2"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="w-7 h-7 bg-purple-600/30 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              {admin && (
                <span className="text-sm font-medium text-white/80 hidden sm:block">
                  {admin.name}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 top-12 w-72 bg-[#1a1025] border border-[#2a2035] rounded-xl shadow-xl z-50 overflow-hidden">
                {admin && (
                  <>
                    <div className="p-4 border-b border-[#2a2035]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-600/30 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{admin.name}</p>
                          <p className="text-white/50 text-sm truncate">{admin.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(admin.role)}`}>
                          {admin.role.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-white/40 text-xs">ID: {admin.adminId}</span>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          setShowPasswordModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-purple-600/10 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                        <span className="text-sm">Change Password</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1025] border border-[#2a2035] rounded-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2035]">
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-purple-600/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0d0a12] border border-[#2a2035] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0d0a12] border border-[#2a2035] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0d0a12] border border-[#2a2035] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 border-[#2a2035] text-white/70 hover:text-white hover:bg-purple-600/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


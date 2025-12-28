"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Plus, Edit, Trash2, Search, UserPlus, Users, UserCheck, UserX, 
  Ban, Eye, EyeOff, Key, Shield, Trophy, MoreVertical, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface User {
  _id: string;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  balance?: number;
  isActive: boolean;
  isBanned?: boolean;
  isReadOnly?: boolean;
  banReason?: string;
  status?: string;
  role?: string;
  kycVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Stats {
  totalAll: number;
  totalActive: number;
  totalInactive: number;
  totalBanned: number;
  totalReadOnly: number;
  totalChallengeUsers: number;
}

function UsersPageContent() {
  const searchParams = useSearchParams();
  const { confirm, Dialog: ConfirmDialog } = useConfirmationDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAll: 0, totalActive: 0, totalInactive: 0, 
    totalBanned: 0, totalReadOnly: 0, totalChallengeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [banReason, setBanReason] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    balance: 0,
    isActive: true,
    kycVerified: false,
  });

  useEffect(() => {
    fetchUsers();
  }, [activeFilter]);

  useEffect(() => {
    try {
      const uid = searchParams?.get?.('userId');
      if (uid) setSearchTerm(uid);
    } catch (e) {}
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '1000');
      
      if (activeFilter === 'active') {
        queryParams.append('status', 'active');
      } else if (activeFilter === 'inactive') {
        queryParams.append('status', 'inactive');
      } else if (activeFilter === 'banned') {
        queryParams.append('filter', 'banned');
      } else if (activeFilter === 'readonly') {
        queryParams.append('filter', 'readonly');
      } else if (activeFilter === 'challenge') {
        queryParams.append('filter', 'challenge');
      }
      
      const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        setUsers(Array.isArray(data.users) ? data.users : []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: number, action: string, extraData?: any) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchUsers();
        return true;
      } else {
        toast.error(data.message || 'Action failed');
        return false;
      }
    } catch (error) {
      toast.error('Action failed');
      return false;
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    const success = await handleAction(selectedUser.userId, 'ban', { banReason });
    if (success) {
      setBanDialogOpen(false);
      setBanReason("");
      setSelectedUser(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const success = await handleAction(selectedUser.userId, 'changePassword', { password: newPassword });
    if (success) {
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User created successfully');
        setDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully');
        setDialogOpen(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    confirm(
      "Delete User",
      "Are you sure you want to delete this user? This action cannot be undone.",
      async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            toast.success('User deleted successfully');
            fetchUsers();
          } else {
            toast.error(data.message || 'Failed to delete user');
          }
        } catch (error) {
          toast.error('Failed to delete user');
        }
      },
      {
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      }
    );
  };

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", password: "", balance: 0, isActive: true, kycVerified: false });
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      balance: user.balance || 0,
      isActive: user.isActive,
      kycVerified: user.kycVerified,
    });
    setDialogOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toString().includes(searchTerm);
    return matchesSearch;
  });

  const getStatusBadge = (user: User) => {
    if (user.isBanned) return <Badge variant="destructive">Banned</Badge>;
    if (user.isReadOnly) return <Badge className="bg-orange-500">Read Only</Badge>;
    if (user.isActive) return <Badge className="bg-green-500">Active</Badge>;
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all users, permissions, and restrictions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={`cursor-pointer ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setActiveFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">All Users</p>
                <p className="text-2xl font-bold">{stats.totalAll}</p>
              </div>
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'active' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setActiveFilter('active')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">{stats.totalActive}</p>
              </div>
              <UserCheck className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'inactive' ? 'ring-2 ring-gray-500' : ''}`} onClick={() => setActiveFilter('inactive')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{stats.totalInactive}</p>
              </div>
              <UserX className="w-6 h-6 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'banned' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setActiveFilter('banned')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Banned</p>
                <p className="text-2xl font-bold text-red-500">{stats.totalBanned}</p>
              </div>
              <Ban className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'readonly' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setActiveFilter('readonly')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Read Only</p>
                <p className="text-2xl font-bold text-orange-500">{stats.totalReadOnly}</p>
              </div>
              <EyeOff className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${activeFilter === 'challenge' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setActiveFilter('challenge')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Challenge Users</p>
                <p className="text-2xl font-bold text-amber-500">{stats.totalChallengeUsers}</p>
              </div>
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {activeFilter === 'all' && 'All Users'}
                {activeFilter === 'active' && 'Active Users'}
                {activeFilter === 'inactive' && 'Inactive Users'}
                {activeFilter === 'banned' && 'Banned Users'}
                {activeFilter === 'readonly' && 'Read Only Users'}
                {activeFilter === 'challenge' && 'Challenge Users'}
              </CardTitle>
              <CardDescription>Showing {filteredUsers.length} users</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm">User ID</th>
                    <th className="text-left p-3 text-sm">Name</th>
                    <th className="text-left p-3 text-sm">Email</th>
                    <th className="text-left p-3 text-sm">Status</th>
                    <th className="text-left p-3 text-sm">KYC</th>
                    <th className="text-left p-3 text-sm">Created</th>
                    <th className="text-left p-3 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{user.userId}</td>
                      <td className="p-3">{user.name}</td>
                      <td className="p-3 text-sm">{user.email}</td>
                      <td className="p-3">{getStatusBadge(user)}</td>
                      <td className="p-3">
                        <Badge variant={user.kycVerified ? "default" : "outline"}>
                          {user.kycVerified ? "Verified" : "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setPasswordDialogOpen(true); }}>
                              <Key className="w-4 h-4 mr-2" /> Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isActive && !user.isBanned && (
                              <DropdownMenuItem onClick={() => handleAction(user.userId, 'deactivate')}>
                                <UserX className="w-4 h-4 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            )}
                            {!user.isActive && !user.isBanned && (
                              <DropdownMenuItem onClick={() => handleAction(user.userId, 'activate')}>
                                <UserCheck className="w-4 h-4 mr-2" /> Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!user.isReadOnly ? (
                              <DropdownMenuItem onClick={() => handleAction(user.userId, 'readonly')}>
                                <EyeOff className="w-4 h-4 mr-2" /> Set Read Only
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(user.userId, 'removeReadonly')}>
                                <Eye className="w-4 h-4 mr-2" /> Remove Read Only
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!user.isBanned ? (
                              <DropdownMenuItem 
                                className="text-red-500"
                                onClick={() => { setSelectedUser(user); setBanDialogOpen(true); }}
                              >
                                <Ban className="w-4 h-4 mr-2" /> Ban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-green-500"
                                onClick={() => handleAction(user.userId, 'unban')}
                              >
                                <Shield className="w-4 h-4 mr-2" /> Unban User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-500"
                              onClick={() => handleDeleteUser(user.userId)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingUser} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Active Status</Label>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>KYC Verified</Label>
              <Switch checked={form.kycVerified} onCheckedChange={(checked) => setForm({ ...form, kycVerified: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Change password for {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordDialogOpen(false); setNewPassword(""); }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.name} ({selectedUser?.email}) - They will not be able to login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for ban (optional)</Label>
              <Input 
                value={banReason} 
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBanDialogOpen(false); setBanReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <UsersPageContent />
    </Suspense>
  );
}

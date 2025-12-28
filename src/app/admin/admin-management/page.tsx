"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/shared/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Wallet, 
  Users, 
  Shield, 
  Link2,
  Copy,
  DollarSign,
  Eye,
  EyeOff
} from "lucide-react";

interface Admin {
  adminId: number;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  phone?: string;
  referralCode?: string;
  commissionRate: number;
  settlementPending: number;
  totalEarnings: number;
  referredUsers: number[];
  referredAdmins: number[];
  createdAt: string;
  wallet?: {
    balance: number;
    totalFundsReceived: number;
  };
}

const ALL_PERMISSIONS = [
  'read',
  'write',
  'delete',
  'manage_users',
  'manage_admins',
  'manage_settings',
  'view_reports',
  'manage_funds',
  'manage_trades',
  'manage_ib',
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
];

export default function AdminManagementPage() {
  const { confirm, Dialog: ConfirmDialog } = useConfirmationDialog();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    phone: "",
    commissionRate: 10,
    permissions: ["read"],
  });

  const [fundAmount, setFundAmount] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (error) {
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Name, email, and password are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Admin created successfully");
        setShowCreateDialog(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "admin",
          phone: "",
          commissionRate: 10,
          permissions: ["read"],
        });
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to create admin");
    }
  };

  const handleUpdate = async () => {
    if (!selectedAdmin) return;

    try {
      const res = await fetch(`/api/admin/admins/${selectedAdmin.adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          commissionRate: formData.commissionRate,
          permissions: formData.permissions,
          isActive: selectedAdmin.isActive,
          ...(formData.password && { password: formData.password }),
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Admin updated successfully");
        setShowEditDialog(false);
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update admin");
    }
  };

  const handleDelete = async (adminId: number) => {
    confirm(
      "Delete Admin",
      "Are you sure you want to delete this admin? This action cannot be undone.",
      async () => {
        try {
          const res = await fetch(`/api/admin/admins/${adminId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          
          if (data.success) {
            toast.success("Admin deleted successfully");
            fetchAdmins();
          } else {
            toast.error(data.message);
          }
        } catch (error) {
          toast.error("Failed to delete admin");
        }
      },
      {
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      }
    );
  };

  const handleTransferFunds = async () => {
    if (!selectedAdmin || !fundAmount) return;

    try {
      const res = await fetch("/api/admin/admins/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAdminId: selectedAdmin.adminId,
          amount: parseFloat(fundAmount),
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowFundDialog(false);
        setFundAmount("");
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to transfer funds");
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/login?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
      phone: admin.phone || "",
      commissionRate: admin.commissionRate,
      permissions: admin.permissions,
    });
    setShowEditDialog(true);
  };

  const openFundDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFundAmount("");
    setShowFundDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage admin accounts with roles and permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-[#1a1025] border-[#2a2035]">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Name *</label>
                  <Input
                    placeholder="Admin name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#0f0a15] border-[#2a2035]"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-[#0f0a15] border-[#2a2035]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-sm text-white/70 mb-1 block">Password *</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-[#0f0a15] border-[#2a2035] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Phone</label>
                  <Input
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#0f0a15] border-[#2a2035]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Role</label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger className="bg-[#0f0a15] border-[#2a2035]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1025] border-[#2a2035]">
                      {ROLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Commission Rate (%)</label>
                  <Input
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData({ ...formData, commissionRate: parseInt(e.target.value) || 0 })}
                    className="bg-[#0f0a15] border-[#2a2035]"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(perm => (
                    <Badge
                      key={perm}
                      variant={formData.permissions.includes(perm) ? "default" : "outline"}
                      className={`cursor-pointer ${formData.permissions.includes(perm) ? 'bg-purple-600' : 'border-[#2a2035]'}`}
                      onClick={() => togglePermission(perm)}
                    >
                      {perm.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="border-[#2a2035]">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                Create Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#1a1025] border-[#2a2035]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{admins.length}</p>
              <p className="text-xs text-white/50">Total Admins</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1a1025] border-[#2a2035]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-600/20">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.isActive).length}</p>
              <p className="text-xs text-white/50">Active Admins</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1a1025] border-[#2a2035]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                ${admins.reduce((sum, a) => sum + (a.wallet?.balance || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/50">Total Admin Funds</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1a1025] border-[#2a2035]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-600/20">
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                ${admins.reduce((sum, a) => sum + (a.settlementPending || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/50">Pending Settlements</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <Input
          placeholder="Search admins..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-[#1a1025] border-[#2a2035]"
        />
      </div>

      {/* Admins Table */}
      <Card className="bg-[#1a1025] border-[#2a2035] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2035]">
                <th className="text-left p-4 text-sm font-medium text-white/70">Admin</th>
                <th className="text-left p-4 text-sm font-medium text-white/70">Role</th>
                <th className="text-left p-4 text-sm font-medium text-white/70">Referral Code</th>
                <th className="text-left p-4 text-sm font-medium text-white/70">Wallet</th>
                <th className="text-left p-4 text-sm font-medium text-white/70">Commission</th>
                <th className="text-left p-4 text-sm font-medium text-white/70">Status</th>
                <th className="text-right p-4 text-sm font-medium text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/50">Loading...</td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/50">No admins found</td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.adminId} className="border-b border-[#2a2035] hover:bg-[#0f0a15]">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white">{admin.name}</p>
                        <p className="text-sm text-white/50">{admin.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={
                        admin.role === 'super_admin' ? 'bg-purple-600' :
                        admin.role === 'admin' ? 'bg-blue-600' : 'bg-gray-600'
                      }>
                        {admin.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {admin.referralCode && (
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-purple-400 bg-purple-600/10 px-2 py-1 rounded">
                            {admin.referralCode}
                          </code>
                          <button
                            onClick={() => copyReferralLink(admin.referralCode!)}
                            className="p-1 hover:bg-[#2a2035] rounded"
                            title="Copy referral link"
                          >
                            <Copy className="w-3.5 h-3.5 text-white/50" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-white">${(admin.wallet?.balance || 0).toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white">{admin.commissionRate}%</p>
                    </td>
                    <td className="p-4">
                      <Badge className={admin.isActive ? 'bg-green-600' : 'bg-red-600'}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {admin.role !== 'super_admin' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openFundDialog(admin)}
                              className="h-8 w-8 p-0"
                              title="Add Funds"
                            >
                              <DollarSign className="w-4 h-4 text-green-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(admin)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(admin.adminId)}
                              className="h-8 w-8 p-0"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg bg-[#1a1025] border-[#2a2035]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#0f0a15] border-[#2a2035]"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-[#0f0a15] border-[#2a2035]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">New Password (optional)</label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-[#0f0a15] border-[#2a2035]"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Commission Rate (%)</label>
                <Input
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseInt(e.target.value) || 0 })}
                  className="bg-[#0f0a15] border-[#2a2035]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-white/70 mb-2 block">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map(perm => (
                  <Badge
                    key={perm}
                    variant={formData.permissions.includes(perm) ? "default" : "outline"}
                    className={`cursor-pointer ${formData.permissions.includes(perm) ? 'bg-purple-600' : 'border-[#2a2035]'}`}
                    onClick={() => togglePermission(perm)}
                  >
                    {perm.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-[#2a2035]">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Transfer Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="max-w-sm bg-[#1a1025] border-[#2a2035]">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-white/70">
              Transfer funds to <span className="text-white font-medium">{selectedAdmin?.name}</span>
            </p>
            <p className="text-sm text-white/50">
              Current balance: ${(selectedAdmin?.wallet?.balance || 0).toLocaleString()}
            </p>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Amount ($)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="bg-[#0f0a15] border-[#2a2035]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-[#2a2035]">Cancel</Button>
            </DialogClose>
            <Button onClick={handleTransferFunds} className="bg-green-600 hover:bg-green-700">
              Transfer Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}


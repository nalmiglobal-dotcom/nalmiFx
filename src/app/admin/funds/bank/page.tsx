"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import { useConfirmationDialog } from "@/shared/components/ui/confirmation-dialog";
import { Plus, Edit, Trash2, Building2, Smartphone, QrCode, CheckCircle2, XCircle } from "lucide-react";

interface PaymentMethod {
  _id: string;
  type: 'bank' | 'upi' | 'qr';
  name: string;
  isActive: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifscCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  upiId?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  notes?: string;
}

export default function BankPage() {
  const { confirm, Dialog: ConfirmDialog } = useConfirmationDialog();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<Partial<PaymentMethod>>({
    type: 'bank',
    name: '',
    isActive: true,
  });
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-methods', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(data.paymentMethods);
      } else {
        toast.error(data.message || 'Failed to fetch payment methods');
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast.error('Network error. Failed to fetch payment methods.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setQrImageFile(file);

    // Create preview and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setQrImagePreview(base64String);
      setForm({ ...form, qrCode: base64String, qrCodeUrl: undefined });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.type) {
      toast.error('Name and type are required');
      return;
    }

    if (form.type === 'bank' && (!form.accountNumber || !form.accountName)) {
      toast.error('Account number and account name are required for bank accounts');
      return;
    }

    if (form.type === 'upi' && !form.upiId) {
      toast.error('UPI ID is required');
      return;
    }

    if (form.type === 'qr' && !form.qrCode && !form.qrCodeUrl) {
      toast.error('QR code image, QR code URL, or base64 data is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingMethod
        ? `/api/admin/payment-methods/${editingMethod._id}`
        : '/api/admin/payment-methods';
      const method = editingMethod ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (editingMethod ? 'Payment method updated' : 'Payment method created'));
        setDialogOpen(false);
        resetForm();
        fetchPaymentMethods();
      } else {
        toast.error(data.message || 'Failed to save payment method');
      }
    } catch (error) {
      console.error('Failed to save payment method:', error);
      toast.error('Network error. Failed to save payment method.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    confirm(
      "Delete Payment Method",
      "Are you sure you want to delete this payment method? This action cannot be undone.",
      async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/payment-methods/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          const data = await res.json();
          if (data.success) {
            toast.success('Payment method deleted successfully');
            fetchPaymentMethods();
          } else {
            toast.error(data.message || 'Failed to delete payment method');
          }
        } catch (error) {
          console.error('Failed to delete payment method:', error);
          toast.error('Network error. Failed to delete payment method.');
        } finally {
          setLoading(false);
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
    setForm({
      type: 'bank',
      name: '',
      isActive: true,
    });
    setEditingMethod(null);
    setQrImagePreview(null);
    setQrImageFile(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setForm(method);
    // Set preview if QR code exists
    if (method.type === 'qr' && method.qrCode) {
      setQrImagePreview(method.qrCode);
    } else if (method.type === 'qr' && method.qrCodeUrl) {
      setQrImagePreview(method.qrCodeUrl);
    } else {
      setQrImagePreview(null);
    }
    setQrImageFile(null);
    setDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5" />;
      case 'upi':
        return <Smartphone className="w-5 h-5" />;
      case 'qr':
        return <QrCode className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage bank accounts, UPI IDs, and QR codes</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" /> Add Payment Method
        </Button>
      </div>

      {loading && paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">Loading payment methods...</CardContent>
        </Card>
      ) : paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No payment methods found. Click "Add Payment Method" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <Card key={method._id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getTypeIcon(method.type)}
                  <div>
                    <h3 className="font-semibold">{method.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">{method.type}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isActive ? (
                    <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>
                  ) : (
                    <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" /> Inactive</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {method.type === 'bank' && (
                  <>
                    {method.bankName && <p><span className="text-muted-foreground">Bank:</span> {method.bankName}</p>}
                    {method.accountNumber && <p><span className="text-muted-foreground">Account:</span> {method.accountNumber}</p>}
                    {method.accountName && <p><span className="text-muted-foreground">Name:</span> {method.accountName}</p>}
                    {method.ifscCode && <p><span className="text-muted-foreground">IFSC:</span> {method.ifscCode}</p>}
                  </>
                )}
                {method.type === 'upi' && method.upiId && (
                  <p><span className="text-muted-foreground">UPI ID:</span> {method.upiId}</p>
                )}
                {method.type === 'qr' && (
                  <>
                    {method.qrCodeUrl && (
                      <div className="mt-2">
                        <img src={method.qrCodeUrl} alt="QR Code" className="w-32 h-32 border rounded" />
                      </div>
                    )}
                      {method.qrCode && !method.qrCodeUrl && (
                        <div className="mt-2">
                          <img src={method.qrCode} alt="QR Code" className="w-32 h-32 border rounded object-contain bg-muted" />
                        </div>
                      )}
                  </>
                )}
                {method.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{method.notes}</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(method)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(method._id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            <DialogDescription>
              {editingMethod ? 'Update payment method details' : 'Create a new payment method for users to deposit funds'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bank">Bank Account</TabsTrigger>
                <TabsTrigger value="upi">UPI</TabsTrigger>
                <TabsTrigger value="qr">QR Code</TabsTrigger>
              </TabsList>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., HDFC Bank Account, Paytm UPI"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active (visible to users)</Label>
                </div>

                <TabsContent value="bank" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={form.bankName || ''}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g., HDFC Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        value={form.accountNumber || ''}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        placeholder="1234567890"
                        required={form.type === 'bank'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name *</Label>
                      <Input
                        id="accountName"
                        value={form.accountName || ''}
                        onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                        placeholder="Account Holder Name"
                        required={form.type === 'bank'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={form.ifscCode || ''}
                        onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                        placeholder="HDFC0001234"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="swiftCode">SWIFT Code</Label>
                      <Input
                        id="swiftCode"
                        value={form.swiftCode || ''}
                        onChange={(e) => setForm({ ...form, swiftCode: e.target.value })}
                        placeholder="HDFCINBB"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={form.routingNumber || ''}
                        onChange={(e) => setForm({ ...form, routingNumber: e.target.value })}
                        placeholder="123456789"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="upi" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID *</Label>
                    <Input
                      id="upiId"
                      value={form.upiId || ''}
                      onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                      placeholder="yourname@paytm"
                      required={form.type === 'upi'}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="qr" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qrImageUpload">Upload QR Code Image *</Label>
                    <Input
                      id="qrImageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload an image file (PNG, JPG, etc.) - Max 5MB. Image will be saved to database as base64.
                    </p>
                    {qrImagePreview && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <div className="relative inline-block">
                          <img
                            src={qrImagePreview}
                            alt="QR Code Preview"
                            className="w-48 h-48 border rounded-lg object-contain bg-muted"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setQrImagePreview(null);
                              setQrImageFile(null);
                              setForm({ ...form, qrCode: undefined });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qrCodeUrl">QR Code URL (Alternative)</Label>
                    <Input
                      id="qrCodeUrl"
                      type="url"
                      value={form.qrCodeUrl || ''}
                      onChange={(e) => {
                        setForm({ ...form, qrCodeUrl: e.target.value, qrCode: undefined });
                        setQrImagePreview(null);
                        setQrImageFile(null);
                      }}
                      placeholder="https://example.com/qr-code.png"
                    />
                    <p className="text-xs text-muted-foreground">
                      Or enter a URL to the QR code image instead of uploading
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qrCode">QR Code (Base64) - Alternative</Label>
                    <Textarea
                      id="qrCode"
                      className="max-w-full break-words break-all whitespace-pre-wrap overflow-x-hidden overflow-y-auto resize-y"
                      value={form.qrCode || ''}
                      onChange={(e) => {
                        setForm({ ...form, qrCode: e.target.value, qrCodeUrl: undefined });
                        if (e.target.value) {
                          setQrImagePreview(e.target.value);
                        } else {
                          setQrImagePreview(null);
                        }
                        setQrImageFile(null);
                      }}
                      placeholder="data:image/png;base64,..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Or paste base64 encoded image data directly
                    </p>
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={form.notes || ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes or instructions"
                    rows={3}
                  />
                </div>
              </div>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Building2, Smartphone, QrCode, ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

interface PaymentMethod {
  _id: string;
  type: 'bank' | 'upi' | 'qr';
  name: string;
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

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [accountTypes, setAccountTypes] = useState<Array<{_id: string; name: string; minDeposit: number}>>([]);
  const [selectedAccountType, setSelectedAccountType] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    fetchPaymentMethods();
    fetchAccountTypes();
  }, []);

  const fetchAccountTypes = async () => {
    try {
      const res = await fetch('/api/user/account-types?type=trading', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setAccountTypes(data.accountTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch account types:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    setLoadingMethods(true);
    setError(null);
    try {
      const res = await fetch('/api/user/payment-methods', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        // Handle non-200 responses
        if (res.status === 401) {
          setError('Please login to access deposit page');
          toast.error('Please login to access deposit page');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
        if (data.paymentMethods && data.paymentMethods.length > 0) {
          setSelectedMethod(data.paymentMethods[0]);
        }
      } else {
        const errorMsg = data.message || 'Failed to load payment methods';
        setError(errorMsg);
        // Don't show toast for "no payment methods" - that's a valid state
        if (!errorMsg.includes('No payment methods')) {
          toast.error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch payment methods:', error);
      const errorMessage = error.message || 'Failed to load payment methods. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingMethods(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (!transactionId || transactionId.trim() === '') {
      toast.error("Please enter Transaction ID/UTR number");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(amount),
          method: selectedMethod.type === 'qr' ? 'upi' : selectedMethod.type,
          paymentMethodId: selectedMethod._id,
          transactionId: transactionId.trim(),
          accountTypeId: selectedAccountType,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please login to submit deposit request');
          router.push('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Deposit request submitted successfully");
        router.push('/wallet');
      } else {
        toast.error(data.message || "Failed to submit deposit request");
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (type: string) => {
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

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Deposit Funds</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add funds to your trading account</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Select Payment Method</CardTitle>
                <CardDescription>Choose your preferred deposit method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button onClick={fetchPaymentMethods} variant="outline">
                      Retry
                    </Button>
                  </div>
                ) : loadingMethods ? (
                  <div className="text-center py-8">Loading payment methods...</div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment methods available. Please contact support.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Available Payment Methods</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {paymentMethods.map((method) => (
                          <Card
                            key={method._id}
                            className={`p-4 cursor-pointer transition-all ${
                              selectedMethod?._id === method._id
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedMethod(method)}
                          >
                            <div className="flex items-center gap-3">
                              {getMethodIcon(method.type)}
                              <div className="flex-1">
                                <p className="font-semibold">{method.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{method.type}</p>
                              </div>
                              {selectedMethod?._id === method._id && (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {selectedMethod && (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                          <div>
                            <h3 className="font-semibold mb-3">Payment Details</h3>
                            {selectedMethod.type === 'bank' && (
                              <div className="space-y-2 text-sm">
                                {selectedMethod.bankName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Bank Name:</span>
                                    <span className="font-medium">{selectedMethod.bankName}</span>
                                  </div>
                                )}
                                {selectedMethod.accountNumber && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Account Number:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-medium">{selectedMethod.accountNumber}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(selectedMethod.accountNumber!, 'account')}
                                      >
                                        {copied === 'account' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {selectedMethod.accountName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Account Name:</span>
                                    <span className="font-medium">{selectedMethod.accountName}</span>
                                  </div>
                                )}
                                {selectedMethod.ifscCode && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">IFSC Code:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-medium">{selectedMethod.ifscCode}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(selectedMethod.ifscCode!, 'ifsc')}
                                      >
                                        {copied === 'ifsc' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {selectedMethod.swiftCode && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">SWIFT Code:</span>
                                    <span className="font-mono font-medium">{selectedMethod.swiftCode}</span>
                                  </div>
                                )}
                                {selectedMethod.routingNumber && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Routing Number:</span>
                                    <span className="font-mono font-medium">{selectedMethod.routingNumber}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedMethod.type === 'upi' && selectedMethod.upiId && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">UPI ID:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{selectedMethod.upiId}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(selectedMethod.upiId!, 'upi')}
                                    >
                                      {copied === 'upi' ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedMethod.type === 'qr' && (
                              <div className="space-y-3">
                                {selectedMethod.qrCodeUrl && (
                                  <div className="flex justify-center">
                                    <img
                                      src={selectedMethod.qrCodeUrl}
                                      alt="QR Code"
                                      className="w-48 h-48 border rounded-lg"
                                    />
                                  </div>
                                )}
                                {selectedMethod.qrCode && !selectedMethod.qrCodeUrl && (
                                  <div className="flex justify-center">
                                    <img
                                      src={selectedMethod.qrCode}
                                      alt="QR Code"
                                      className="w-48 h-48 border rounded-lg"
                                    />
                                  </div>
                                )}
                                {selectedMethod.upiId && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">UPI ID:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{selectedMethod.upiId}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(selectedMethod.upiId!, 'qr-upi')}
                                      >
                                        {copied === 'qr-upi' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedMethod.notes && (
                              <div className="mt-3 p-2 bg-background rounded text-xs text-muted-foreground">
                                {selectedMethod.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {accountTypes.length > 0 && (
                            <div className="space-y-2">
                              <Label htmlFor="accountType">Account Type (Optional)</Label>
                              <Select 
                                value={selectedAccountType || undefined} 
                                onValueChange={(value) => setSelectedAccountType(value || undefined)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account type (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountTypes.map((type) => (
                                    <SelectItem key={type._id} value={type._id}>
                                      {type.name} (Min: ${type.minDeposit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {selectedAccountType 
                                    ? `Minimum deposit: $${accountTypes.find(t => t._id === selectedAccountType)?.minDeposit || 0}`
                                    : 'Select an account type to validate minimum deposit requirement'}
                                </p>
                                {selectedAccountType && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setSelectedAccountType(undefined)}
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="amount">Deposit Amount (USD) *</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder={selectedAccountType 
                                ? `Enter amount (Min: $${accountTypes.find(t => t._id === selectedAccountType)?.minDeposit || 0})`
                                : "Enter amount"}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              min={selectedAccountType ? (accountTypes.find(t => t._id === selectedAccountType)?.minDeposit || 1).toString() : "1"}
                              step="0.01"
                            />
                            {selectedAccountType && (
                              <p className="text-xs text-muted-foreground">
                                Minimum deposit for selected account type: ${accountTypes.find(t => t._id === selectedAccountType)?.minDeposit || 0}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="transactionId">Transaction ID/UTR Number *</Label>
                            <Input
                              id="transactionId"
                              type="text"
                              placeholder="Enter your transaction ID or UTR number"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the transaction reference number from your payment receipt
                            </p>
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleDeposit}
                            disabled={loading || !amount || !transactionId}
                          >
                            {loading ? "Submitting..." : "Submit Deposit Request"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
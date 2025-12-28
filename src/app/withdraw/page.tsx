"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Header } from "@/domains/trading/components/Header";
import { Sidebar } from "@/domains/trading/components/Sidebar";
import { MobileNav } from "@/shared/components/ui/MobileNav";
import { Building2, Smartphone, Wallet, Plus, Trash2, ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
}

interface UPIAccount {
  id: string;
  upiId: string;
}

interface CryptoWallet {
  id: string;
  network: string;
  address: string;
  label?: string;
}

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bank");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Fetch wallet balance on mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const res = await fetch('/api/user/wallet', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.wallet) {
          setWalletBalance(data.wallet.balance || 0);
        }
      } catch (error) {
        console.error('Error fetching wallet:', error);
      } finally {
        setLoadingWallet(false);
      }
    };
    fetchWalletBalance();
  }, []);

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    ifscCode: "",
  });

  // UPI Accounts
  const [upiAccounts, setUpiAccounts] = useState<UPIAccount[]>([]);
  const [showUpiForm, setShowUpiForm] = useState(false);
  const [upiForm, setUpiForm] = useState({ upiId: "" });

  // Crypto Wallets
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [showCryptoForm, setShowCryptoForm] = useState(false);
  const [cryptoForm, setCryptoForm] = useState({
    network: "",
    address: "",
    label: "",
  });

  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const handleAddBankAccount = () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ifscCode) {
      toast.error("Please fill all fields");
      return;
    }
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      ...bankForm,
    };
    setBankAccounts([...bankAccounts, newAccount]);
    setBankForm({ bankName: "", accountNumber: "", accountHolderName: "", ifscCode: "" });
    setShowBankForm(false);
  };

  const handleAddUpiAccount = () => {
    if (!upiForm.upiId) {
      toast.error("Please enter UPI ID");
      return;
    }
    const newAccount: UPIAccount = {
      id: Date.now().toString(),
      ...upiForm,
    };
    setUpiAccounts([...upiAccounts, newAccount]);
    setUpiForm({ upiId: "" });
    setShowUpiForm(false);
  };

  const handleAddCryptoWallet = () => {
    if (!cryptoForm.network || !cryptoForm.address) {
      toast.error("Please fill all required fields");
      return;
    }
    const newWallet: CryptoWallet = {
      id: Date.now().toString(),
      ...cryptoForm,
    };
    setCryptoWallets([...cryptoWallets, newWallet]);
    setCryptoForm({ network: "", address: "", label: "" });
    setShowCryptoForm(false);
  };

  const handleDeleteBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter((acc) => acc.id !== id));
    if (selectedAccount === id) setSelectedAccount("");
  };

  const handleDeleteUpiAccount = (id: string) => {
    setUpiAccounts(upiAccounts.filter((acc) => acc.id !== id));
    if (selectedAccount === id) setSelectedAccount("");
  };

  const handleDeleteCryptoWallet = (id: string) => {
    setCryptoWallets(cryptoWallets.filter((wallet) => wallet.id !== id));
    if (selectedAccount === id) setSelectedAccount("");
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (parseFloat(amount) > walletBalance) {
      toast.error("Insufficient balance. You cannot withdraw more than your available balance.");
      return;
    }
    if (!selectedAccount) {
      toast.error("Please select a withdrawal method");
      return;
    }

    // Find selected account details
    let method: "bank" | "upi" | "crypto" = "bank";
    let accountDetails: any = {};

    const bankAccount = bankAccounts.find((acc) => acc.id === selectedAccount);
    const upiAccount = upiAccounts.find((acc) => acc.id === selectedAccount);
    const cryptoWallet = cryptoWallets.find((wallet) => wallet.id === selectedAccount);

    if (bankAccount) {
      method = "bank";
      accountDetails = {
        accountNumber: bankAccount.accountNumber,
        ifscCode: bankAccount.ifscCode,
        bankName: bankAccount.bankName,
        accountHolderName: bankAccount.accountHolderName,
      };
    } else if (upiAccount) {
      method = "upi";
      accountDetails = {
        upiId: upiAccount.upiId,
      };
    } else if (cryptoWallet) {
      method = "crypto";
      accountDetails = {
        cryptoAddress: cryptoWallet.address,
        cryptoType: cryptoWallet.network,
      };
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(amount),
          method,
          accountDetails,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        router.push('/wallet');
      } else {
        toast.error(data.message || "Failed to submit withdrawal request");
      }
    } catch (error: any) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Withdraw Funds</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Withdraw funds from your account</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Amount</CardTitle>
                <CardDescription>Enter the amount you want to withdraw</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount (USD)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available Balance: {loadingWallet ? 'Loading...' : `$${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Method</CardTitle>
                <CardDescription>Select or add a withdrawal method</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="bank" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Bank Account</span>
                      <span className="sm:hidden">Bank</span>
                    </TabsTrigger>
                    <TabsTrigger value="upi" className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      UPI
                    </TabsTrigger>
                    <TabsTrigger value="crypto" className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">Crypto Wallet</span>
                      <span className="sm:hidden">Crypto</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="bank" className="space-y-4 mt-4">
                    {!showBankForm ? (
                      <div className="space-y-4">
                        {bankAccounts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No bank accounts added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bankAccounts.map((account) => (
                              <Card
                                key={account.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedAccount === account.id ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() => setSelectedAccount(account.id)}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{account.bankName}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {account.accountHolderName}
                                      </p>
                                      <p className="text-xs text-muted-foreground font-mono mt-1">
                                        ****{account.accountNumber.slice(-4)} | IFSC: {account.ifscCode}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBankAccount(account.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowBankForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Bank Account
                        </Button>
                      </div>
                    ) : (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="bank-name">Bank Name</Label>
                              <Input
                                id="bank-name"
                                placeholder="Enter bank name"
                                value={bankForm.bankName}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, bankName: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="account-number">Account Number</Label>
                              <Input
                                id="account-number"
                                placeholder="Enter account number"
                                value={bankForm.accountNumber}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, accountNumber: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="account-holder">Account Holder Name</Label>
                              <Input
                                id="account-holder"
                                placeholder="Enter account holder name"
                                value={bankForm.accountHolderName}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, accountHolderName: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ifsc">IFSC Code</Label>
                              <Input
                                id="ifsc"
                                placeholder="Enter IFSC code"
                                value={bankForm.ifscCode}
                                onChange={(e) =>
                                  setBankForm({ ...bankForm, ifscCode: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowBankForm(false);
                                  setBankForm({
                                    bankName: "",
                                    accountNumber: "",
                                    accountHolderName: "",
                                    ifscCode: "",
                                  });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button className="flex-1" onClick={handleAddBankAccount}>
                                Add Account
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="upi" className="space-y-4 mt-4">
                    {!showUpiForm ? (
                      <div className="space-y-4">
                        {upiAccounts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No UPI accounts added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {upiAccounts.map((account) => (
                              <Card
                                key={account.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedAccount === account.id ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() => setSelectedAccount(account.id)}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">UPI ID</p>
                                      <p className="text-sm text-muted-foreground font-mono">
                                        {account.upiId}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUpiAccount(account.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowUpiForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add UPI Account
                        </Button>
                      </div>
                    ) : (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="upi-id">UPI ID</Label>
                              <Input
                                id="upi-id"
                                placeholder="yourname@paytm"
                                value={upiForm.upiId}
                                onChange={(e) => setUpiForm({ upiId: e.target.value })}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowUpiForm(false);
                                  setUpiForm({ upiId: "" });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button className="flex-1" onClick={handleAddUpiAccount}>
                                Add UPI
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="crypto" className="space-y-4 mt-4">
                    {!showCryptoForm ? (
                      <div className="space-y-4">
                        {cryptoWallets.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No crypto wallets added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {cryptoWallets.map((wallet) => (
                              <Card
                                key={wallet.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedAccount === wallet.id ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() => setSelectedAccount(wallet.id)}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{wallet.network}</p>
                                      {wallet.label && (
                                        <p className="text-sm text-muted-foreground">{wallet.label}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                                        {wallet.address}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCryptoWallet(wallet.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCryptoForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Crypto Wallet
                        </Button>
                      </div>
                    ) : (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="crypto-network-select">Network</Label>
                              <select
                                id="crypto-network-select"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                value={cryptoForm.network}
                                onChange={(e) =>
                                  setCryptoForm({ ...cryptoForm, network: e.target.value })
                                }
                              >
                                <option value="">Select network</option>
                                <option>Bitcoin (BTC)</option>
                                <option>Ethereum (ETH)</option>
                                <option>USDT (TRC20)</option>
                                <option>USDT (ERC20)</option>
                                <option>Litecoin (LTC)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="crypto-address">Wallet Address</Label>
                              <Input
                                id="crypto-address"
                                placeholder="Enter wallet address"
                                value={cryptoForm.address}
                                onChange={(e) =>
                                  setCryptoForm({ ...cryptoForm, address: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="crypto-label">Label (Optional)</Label>
                              <Input
                                id="crypto-label"
                                placeholder="e.g., My Bitcoin Wallet"
                                value={cryptoForm.label}
                                onChange={(e) =>
                                  setCryptoForm({ ...cryptoForm, label: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowCryptoForm(false);
                                  setCryptoForm({ network: "", address: "", label: "" });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button className="flex-1" onClick={handleAddCryptoWallet}>
                                Add Wallet
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleWithdraw}
                  disabled={loading || !amount || !selectedAccount}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? "Processing..." : "Send Withdrawal Request"}
                </Button>
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
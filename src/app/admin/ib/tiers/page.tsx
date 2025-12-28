"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useEffect, useState, FormEvent } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface IBTier {
  _id: string;
  name: string;
  minReferrals: number;
  maxReferrals: number;
  commissionRate: number;
}

export default function TierManagementPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<IBTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTier, setNewTier] = useState({
    name: "",
    minReferrals: "",
    maxReferrals: "",
    commissionRate: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ib/tiers", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTiers(data.tiers);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch tiers.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewTier((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;
    try {
      const res = await fetch(`/api/admin/ib/tiers?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tier deleted successfully');
        fetchTiers();
      } else {
        toast.error(data.message || 'Failed to delete tier');
      }
    } catch (err) {
      toast.error('Failed to delete tier');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/ib/tiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTier),
      });
      const data = await res.json();
      if (data.success) {
        fetchTiers(); // Refresh the list
        setNewTier({ name: "", minReferrals: "", maxReferrals: "", commissionRate: "" }); // Reset form
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to create tier.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">IB Tier Management</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commission Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier Name</TableHead>
                    <TableHead>Referral Range</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier._id}>
                      <TableCell>{tier.name}</TableCell>
                      <TableCell>{`${tier.minReferrals} - ${tier.maxReferrals}`}</TableCell>
                      <TableCell>{`${(tier.commissionRate * 100).toFixed(2)}%`}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={() => handleDelete(tier._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && tiers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No tiers found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create New Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="name"
                placeholder="Tier Name (e.g., Bronze)"
                value={newTier.name}
                onChange={handleInputChange}
                required
              />
              <Input
                name="minReferrals"
                placeholder="Min Referrals"
                type="number"
                value={newTier.minReferrals}
                onChange={handleInputChange}
                required
                min="0"
              />
              <Input
                name="maxReferrals"
                placeholder="Max Referrals"
                type="number"
                value={newTier.maxReferrals}
                onChange={handleInputChange}
                required
                min="0"
              />
              <Input
                name="commissionRate"
                placeholder="Commission Rate (e.g., 0.1 for 10%)"
                type="number"
                step="0.01"
                value={newTier.commissionRate}
                onChange={handleInputChange}
                required
                min="0"
                max="1"
              />
              <Button type="submit" className="w-full">Create Tier</Button>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Trophy, Calendar, Users, DollarSign, Eye, RefreshCw, Award, Clock, Tag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

interface Competition {
  _id: string;
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  category: 'top_scalping' | 'top_trading' | 'most_profit' | 'trader_of_day' | 'general';
  startDate: string;
  endDate: string;
  entryOpenDate: string;
  entryCloseDate: string;
  entryFee: number;
  prizePool: { total: number };
  winnerPrizes: { first: number; second: number; third: number };
  status: 'upcoming' | 'ongoing' | 'ended';
  participants: string[];
  maxParticipants?: number;
  rules?: {
    minTrades?: number;
    maxTrades?: number;
    maxDailyLoss?: number;
    maxOverallLoss?: number;
    customRules?: string[];
  };
  leaderboard?: Array<{
    odType: string;
    odId: string;
    odName: string;
    odCountry?: string;
    trades: number;
    winRatio: number;
    profit: number;
    profitPercentage: number;
    rank: number;
  }>;
  winners?: Array<{
    odName: string;
    position: number;
    prize: number;
    profit: number;
    profitPercentage: number;
  }>;
  organizer: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingCompetition, setViewingCompetition] = useState<Competition | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    category: 'general' as 'top_scalping' | 'top_trading' | 'most_profit' | 'trader_of_day' | 'general',
    startDate: '',
    endDate: '',
    entryOpenDate: '',
    entryCloseDate: '',
    entryFee: 0,
    prizePoolTotal: 0,
    firstPrize: 0,
    secondPrize: 0,
    thirdPrize: 0,
    maxParticipants: '',
    minTrades: '',
    maxDailyLoss: '',
    maxOverallLoss: '',
    customRules: '',
    organizer: 'NalmiFXs',
    tags: '',
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/competitions', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setCompetitions(data.competitions || []);
      } else {
        toast.error(data.message || 'Failed to fetch competitions');
      }
    } catch (error) {
      console.error('Failed to fetch competitions:', error);
      toast.error('Failed to fetch competitions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (competition?: Competition) => {
    if (competition) {
      setEditingCompetition(competition);
      setFormData({
        name: competition.name,
        description: competition.description || '',
        type: competition.type,
        category: competition.category || 'general',
        startDate: new Date(competition.startDate).toISOString().slice(0, 16),
        endDate: new Date(competition.endDate).toISOString().slice(0, 16),
        entryOpenDate: competition.entryOpenDate ? new Date(competition.entryOpenDate).toISOString().slice(0, 16) : '',
        entryCloseDate: competition.entryCloseDate ? new Date(competition.entryCloseDate).toISOString().slice(0, 16) : '',
        entryFee: competition.entryFee,
        prizePoolTotal: competition.prizePool?.total || 0,
        firstPrize: competition.winnerPrizes?.first || 0,
        secondPrize: competition.winnerPrizes?.second || 0,
        thirdPrize: competition.winnerPrizes?.third || 0,
        maxParticipants: competition.maxParticipants?.toString() || '',
        minTrades: competition.rules?.minTrades?.toString() || '',
        maxDailyLoss: competition.rules?.maxDailyLoss?.toString() || '',
        maxOverallLoss: competition.rules?.maxOverallLoss?.toString() || '',
        customRules: competition.rules?.customRules?.join('\n') || '',
        organizer: competition.organizer || 'NalmiFXs',
        tags: competition.tags?.join(', ') || '',
      });
    } else {
      setEditingCompetition(null);
      setFormData({
        name: '',
        description: '',
        type: 'monthly',
        category: 'general',
        startDate: '',
        endDate: '',
        entryOpenDate: '',
        entryCloseDate: '',
        entryFee: 0,
        prizePoolTotal: 0,
        firstPrize: 0,
        secondPrize: 0,
        thirdPrize: 0,
        maxParticipants: '',
        minTrades: '',
        maxDailyLoss: '',
        maxOverallLoss: '',
        customRules: '',
        organizer: 'NalmiFXs',
        tags: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/competitions/seed', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Sample data created successfully!');
        fetchCompetitions();
      } else {
        toast.error(data.message || 'Failed to seed data');
      }
    } catch (error) {
      toast.error('Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCompetition(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const url = editingCompetition
        ? `/api/admin/competitions/${editingCompetition._id}`
        : '/api/admin/competitions';
      const method = editingCompetition ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          startDate: formData.startDate,
          endDate: formData.endDate,
          entryOpenDate: formData.entryOpenDate || formData.startDate,
          entryCloseDate: formData.entryCloseDate || formData.startDate,
          entryFee: formData.entryFee,
          prizePool: { total: formData.prizePoolTotal },
          winnerPrizes: {
            first: formData.firstPrize,
            second: formData.secondPrize,
            third: formData.thirdPrize,
          },
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
          rules: {
            minTrades: formData.minTrades ? parseInt(formData.minTrades) : undefined,
            maxDailyLoss: formData.maxDailyLoss ? parseFloat(formData.maxDailyLoss) : undefined,
            maxOverallLoss: formData.maxOverallLoss ? parseFloat(formData.maxOverallLoss) : undefined,
            customRules: formData.customRules ? formData.customRules.split('\n').filter(r => r.trim()) : [],
          },
          organizer: formData.organizer,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingCompetition ? 'Competition updated successfully' : 'Competition created successfully');
        handleCloseDialog();
        fetchCompetitions();
      } else {
        toast.error(data.message || 'Failed to save competition');
      }
    } catch (error) {
      console.error('Failed to save competition:', error);
      toast.error('Failed to save competition');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      top_scalping: 'Top Scalping',
      top_trading: 'Top Trading',
      most_profit: 'Most Profit',
      trader_of_day: 'Trader of Day',
      general: 'General',
    };
    return labels[category] || category;
  };

  const filteredCompetitions = statusFilter === 'all' 
    ? competitions 
    : competitions.filter(c => c.status === statusFilter);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/admin/competitions/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Competition deleted successfully');
        setDeleteId(null);
        fetchCompetitions();
      } else {
        toast.error(data.message || 'Failed to delete competition');
      }
    } catch (error) {
      console.error('Failed to delete competition:', error);
      toast.error('Failed to delete competition');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge variant="default" className="bg-green-500/20 text-green-500">Ongoing</Badge>;
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Competition Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage trading competitions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedData} disabled={seeding}>
            <RefreshCw className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Creating...' : 'Seed Sample Data'}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Competition
          </Button>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompetition ? 'Edit Competition' : 'Create Competition'}
              </DialogTitle>
              <DialogDescription>
                {editingCompetition ? 'Update competition details' : 'Create a new competition'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., December 2025 Monthly Competition"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter competition description (optional)"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="top_scalping">Top Scalping</SelectItem>
                      <SelectItem value="top_trading">Top Trading</SelectItem>
                      <SelectItem value="most_profit">Most Profit %</SelectItem>
                      <SelectItem value="trader_of_day">Trader of Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="mt-2" />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entry Opens</Label>
                  <Input type="datetime-local" value={formData.entryOpenDate} onChange={(e) => setFormData({ ...formData, entryOpenDate: e.target.value })} className="mt-2" />
                </div>
                <div>
                  <Label>Entry Closes</Label>
                  <Input type="datetime-local" value={formData.entryCloseDate} onChange={(e) => setFormData({ ...formData, entryCloseDate: e.target.value })} className="mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entry Fee ($)</Label>
                  <Input type="number" value={formData.entryFee} onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) || 0 })} className="mt-2" min="0" />
                </div>
                <div>
                  <Label>Prize Pool ($)</Label>
                  <Input type="number" value={formData.prizePoolTotal} onChange={(e) => setFormData({ ...formData, prizePoolTotal: parseFloat(e.target.value) || 0 })} className="mt-2" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>1st Prize ($)</Label>
                  <Input type="number" value={formData.firstPrize} onChange={(e) => setFormData({ ...formData, firstPrize: parseFloat(e.target.value) || 0 })} className="mt-2" min="0" />
                </div>
                <div>
                  <Label>2nd Prize ($)</Label>
                  <Input type="number" value={formData.secondPrize} onChange={(e) => setFormData({ ...formData, secondPrize: parseFloat(e.target.value) || 0 })} className="mt-2" min="0" />
                </div>
                <div>
                  <Label>3rd Prize ($)</Label>
                  <Input type="number" value={formData.thirdPrize} onChange={(e) => setFormData({ ...formData, thirdPrize: parseFloat(e.target.value) || 0 })} className="mt-2" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Participants</Label>
                  <Input type="number" value={formData.maxParticipants} onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })} placeholder="Unlimited" className="mt-2" min="1" />
                </div>
                <div>
                  <Label>Min Trades Required</Label>
                  <Input type="number" value={formData.minTrades} onChange={(e) => setFormData({ ...formData, minTrades: e.target.value })} placeholder="0" className="mt-2" min="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Daily Loss (%)</Label>
                  <Input type="number" value={formData.maxDailyLoss} onChange={(e) => setFormData({ ...formData, maxDailyLoss: e.target.value })} placeholder="e.g. 5" className="mt-2" />
                </div>
                <div>
                  <Label>Max Overall Loss (%)</Label>
                  <Input type="number" value={formData.maxOverallLoss} onChange={(e) => setFormData({ ...formData, maxOverallLoss: e.target.value })} placeholder="e.g. 10" className="mt-2" />
                </div>
              </div>

              <div>
                <Label>Custom Rules (one per line)</Label>
                <Textarea value={formData.customRules} onChange={(e) => setFormData({ ...formData, customRules: e.target.value })} placeholder="EA execution is prohibited&#10;Max hold time 5 minutes" className="mt-2" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Organizer</Label>
                  <Input value={formData.organizer} onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} className="mt-2" />
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="scalping, weekly" className="mt-2" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCompetition ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : competitions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No competitions yet</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Competition
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompetitions.map((competition) => (
              <Card key={competition._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">{competition.name}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getStatusBadge(competition.status)}
                        <Badge variant="outline">{competition.type}</Badge>
                        {competition.category && <Badge variant="secondary">{getCategoryLabel(competition.category)}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Starts</span>
                      <span>{new Date(competition.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends</span>
                      <span>{new Date(competition.endDate).toLocaleDateString()}</span>
                    </div>
                    {competition.status === 'ongoing' && (
                      <div className="text-sm font-semibold text-green-500">Ends in {getDaysRemaining(competition.endDate)} days</div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participants</span>
                      <span>{(competition.leaderboard?.length || 0) + competition.participants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Prize Pool</span>
                      <span className="font-semibold">${(competition.prizePool?.total || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry Fee</span>
                      <span className="font-semibold">{competition.entryFee === 0 ? 'Free' : `$${competition.entryFee}`}</span>
                    </div>
                    {competition.winnerPrizes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Award className="w-3 h-3" /> Prizes</span>
                        <span className="text-xs">${competition.winnerPrizes.first} / ${competition.winnerPrizes.second} / ${competition.winnerPrizes.third}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Button variant="default" size="sm" onClick={() => setViewingCompetition(competition)}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(competition)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteId(competition._id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the competition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingCompetition} onOpenChange={() => setViewingCompetition(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingCompetition?.name}</DialogTitle>
            <DialogDescription>
              {viewingCompetition?.status === 'ongoing' ? 'Live Leaderboard' : 'Competition Details'}
            </DialogDescription>
          </DialogHeader>
          {viewingCompetition && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{viewingCompetition.status}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Entry Fee</p>
                  <p className="font-semibold">{viewingCompetition.entryFee === 0 ? 'Free' : `$${viewingCompetition.entryFee}`}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Prize Pool</p>
                  <p className="font-semibold">${(viewingCompetition.prizePool?.total || 0).toLocaleString()}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Participants</p>
                  <p className="font-semibold">{(viewingCompetition.leaderboard?.length || 0) + viewingCompetition.participants.length}</p>
                </Card>
              </div>

              {viewingCompetition.rules && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Trading Rules</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {viewingCompetition.rules.maxOverallLoss && <p>• {viewingCompetition.rules.maxOverallLoss}% Max Overall Loss</p>}
                    {viewingCompetition.rules.maxDailyLoss && <p>• {viewingCompetition.rules.maxDailyLoss}% Max Daily Loss</p>}
                    {viewingCompetition.rules.minTrades && <p>• Min {viewingCompetition.rules.minTrades} trades</p>}
                    {viewingCompetition.rules.customRules?.map((rule, i) => <p key={i}>• {rule}</p>)}
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Win Ratio</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Gain</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingCompetition.leaderboard?.slice(0, 20).map((entry, idx) => (
                        <TableRow key={idx} className={idx < 3 ? 'bg-muted/30' : ''}>
                          <TableCell className="font-semibold">
                            {entry.rank === 1 && '🥇 '}
                            {entry.rank === 2 && '🥈 '}
                            {entry.rank === 3 && '🥉 '}
                            {entry.rank}
                          </TableCell>
                          <TableCell className="font-medium">{entry.odName}</TableCell>
                          <TableCell>{entry.odCountry || '-'}</TableCell>
                          <TableCell className="text-right">{entry.trades}</TableCell>
                          <TableCell className="text-right">{entry.winRatio}%</TableCell>
                          <TableCell className="text-right text-green-500 font-semibold">${entry.profit.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-500 font-semibold">{entry.profitPercentage.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                      {(!viewingCompetition.leaderboard || viewingCompetition.leaderboard.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No leaderboard data yet. Click "Seed Sample Data" to generate mock traders.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {viewingCompetition.winners && viewingCompetition.winners.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Winners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {viewingCompetition.winners.map((winner, idx) => (
                        <Card key={idx} className="p-4 text-center">
                          <p className="text-2xl mb-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</p>
                          <p className="font-semibold">{winner.odName}</p>
                          <p className="text-green-500 font-bold">${winner.prize.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{winner.profitPercentage.toFixed(2)}% gain</p>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


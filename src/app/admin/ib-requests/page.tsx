"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export default function AdminIBRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ib-requests');
      let data: any = null;
      try { data = await res.json(); } catch (err) { data = null; }
      if (data && data.success) setRequests(data.requests || []);
      else toast.error((data && data.message) || 'Failed to load');
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const action = async (id: string, act: 'approve' | 'reject') => {
    const body: any = { id, action: act };
    if (act === 'approve') body.commission_percentage = 20; // example override
    try {
      const res = await fetch('/api/admin/ib-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let data: any = null;
      try { data = await res.json(); } catch (err) { data = null; }
      if (data && data.success) {
        toast.success(data.message || 'OK');
        fetchRequests();
      } else {
        toast.error((data && data.message) || 'Failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">IB Requests</h1>
      <Card>
        <div className="p-4">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-muted-foreground">No IB requests</div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r._id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{r.user?.name || `User #${r.userId}`}</div>
                    <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                    <div className="text-xs text-muted-foreground">Requested: {new Date(r.requested_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">Status: {r.status}</div>
                    {r.status === 'pending' && (
                      <>
                        <Button onClick={() => action(r._id, 'approve')}>Approve</Button>
                        <Button variant="ghost" onClick={() => action(r._id, 'reject')}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

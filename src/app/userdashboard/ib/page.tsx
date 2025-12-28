"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { toast } from 'sonner';
import { MobileNav } from '@/shared/components/ui/MobileNav';
import { Header } from '@/domains/trading/components/Header';
import { Sidebar } from '@/domains/trading/components/Sidebar';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BecomeIBPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<any>(null);

  const commissionStructure = [
    { instrument: 'Forex', percent: 20 },
    { instrument: 'Crypto', percent: 15 },
    { instrument: 'Indices', percent: 10 },
  ];

  const onApply = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ib/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed_terms_version: 'v1', commission_structure_id: 'default' }),
      });
      if (res.status === 401 || res.status === 403) {
        // Not logged in — redirect to login and preserve return URL
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      let data: any = null;
      try { data = await res.json(); } catch (err) { data = null; }
      if (data && data.success) {
        toast.success('IB request sent');
        // refresh request status
        await fetchRequest();
      } else {
        toast.error((data && data.message) || 'Failed to send request');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequest = async () => {
    try {
      const res = await fetch('/api/ib/request');
      if (!res.ok) return;
      let json: any = null;
      try { json = await res.json(); } catch (err) { json = null; }
      if (json?.success) {
        setRequest(json.request || null);
      }
    } catch (e) {
      // ignore
    }
  };

  // Check if user has IB access and redirect to IB dashboard
  const checkIbAccess = async () => {
    try {
      const res = await fetch('/api/user/ib-dashboard');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data) {
          // User has IB access - redirect to IB dashboard
          window.location.href = '/dashboard/ib';
          return true;
        }
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  // Fetch user and request status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // First check if user has IB access (ib_code or approved request)
        const hasAccess = await checkIbAccess();
        if (!mounted || hasAccess) return;

        // Otherwise fetch the IB request status
        const reqRes = await fetch('/api/ib/request');
        if (reqRes.ok) {
          const reqJson = await reqRes.json();
          if (!mounted) return;
          if (reqJson?.success && reqJson.request) {
            setRequest(reqJson.request);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenInstruments={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
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
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Become an IB</h1>
                <p className="text-sm text-muted-foreground mt-1">Apply to become an Introducing Broker</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>IB Terms & Conditions</CardTitle>
                <CardDescription>Please review and accept to apply</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none mb-4">
                  <p>By becoming an IB you agree to the platform terms. You will be responsible for referring users and ensuring compliance.</p>
                  <p>Commission payments are calculated based on brokerage generated by referred users.</p>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold">Commission Structure (read-only)</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {commissionStructure.map((c) => (
                      <li key={c.instrument}>{c.instrument}: {c.percent}% of brokerage</li>
                    ))}
                  </ul>
                </div>

                {request ? (
                  <div className="mt-4">
                    <p className="font-semibold">Your request status: <span className="capitalize">{request.status}</span></p>
                    {request.status === 'pending' && (
                      <p className="text-sm text-muted-foreground mt-2">Your request is pending review.</p>
                    )}
                    {request.status === 'rejected' && (
                      <>
                        <p className="text-sm text-destructive mt-2">Your request was rejected.</p>
                        {request.admin_reason && <p className="text-sm text-muted-foreground mt-1">Remark: {request.admin_reason}</p>}
                        <div className="mt-4">
                          <Button type="button" onClick={onApply} disabled={loading}>{loading ? 'Submitting...' : 'Reapply for IB'}</Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
                      <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(Boolean(v))} disabled={loading} />
                      <span className="text-sm">I have read & agree</span>
                    </label>

                    <div className="mt-6">
                      <Button type="button" disabled={!agreed || loading} onClick={onApply}>{loading ? 'Sending...' : 'Send IB Request'}</Button>
                    </div>
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

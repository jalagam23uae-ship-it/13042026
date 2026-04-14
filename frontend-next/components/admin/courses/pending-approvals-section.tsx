'use client';

import { useState, useEffect, useTransition } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

type ApprovalRow = {
  id: number;
  type: string;
  requester_id: number;
  requester_name?: string | null;
  target_id: number;
  course_title?: string | null;
  status: string;
  comments?: string | null;
  created_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function PendingApprovalsSection() {
  const router = useRouter();
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, startAct] = useTransition();

  async function load() {
    setLoading(true);
    const client = browserClient();
    const { data } = await (client as ReturnType<typeof browserClient>).GET(
      '/approvals/pending' as never, {} as never,
    );
    setItems(Array.isArray(data) ? (data as ApprovalRow[]) : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function approve(id: number) {
    startAct(async () => {
      const client = browserClient();
      const { error } = await (client as ReturnType<typeof browserClient>).PUT(
        `/approvals/${id}/approve` as never, {} as never,
      );
      if (error) { toast.error('Failed to approve.'); return; }
      toast.success('Course approved — now visible to students');
      await load();
      router.refresh();
    });
  }

  function reject(id: number) {
    if (!rejectReason.trim()) { toast.error('Please enter a reason for rejection'); return; }
    startAct(async () => {
      const client = browserClient();
      const { error } = await (client as ReturnType<typeof browserClient>).PUT(
        `/approvals/${id}/reject` as never,
        { body: { comments: rejectReason.trim() } } as never,
      );
      if (error) { toast.error('Failed to reject.'); return; }
      toast.success('Course rejected');
      setRejectId(null);
      setRejectReason('');
      await load();
      router.refresh();
    });
  }

  const courseItems = items.filter((r) => r.type === 'course_publish');

  if (!loading && courseItems.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
          <Clock className="size-4" />
          Pending approvals
          {!loading && courseItems.length > 0 && (
            <Badge className="bg-amber-500 text-white ml-1">{courseItems.length}</Badge>
          )}
          <button
            type="button"
            onClick={load}
            className="ml-auto rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="size-3.5 text-amber-600" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseItems.map((row) => (
                <>
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.course_title ?? `Course #${row.target_id}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.requester_name ?? `User #${row.requester_id}`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => approve(row.id)}
                          disabled={acting}
                        >
                          {acting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setRejectId(rejectId === row.id ? null : row.id)}
                          disabled={acting}
                        >
                          <XCircle className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {rejectId === row.id && (
                    <TableRow key={`${row.id}-reject`} className="bg-red-50/50 dark:bg-red-950/20">
                      <TableCell colSpan={4} className="pt-2 pb-3">
                        <div className="flex items-center gap-2 max-w-lg">
                          <Input
                            placeholder="Reason for rejection…"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => reject(row.id)}
                            disabled={acting || !rejectReason.trim()}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setRejectId(null); setRejectReason(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

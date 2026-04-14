'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings2, Loader2, CheckCircle2, XCircle, Users,
  BarChart2, Award, Clock, Pencil, Search, Trash2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn, fmt } from '@/lib/utils';
import { browserClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

type TestRow = {
  id: number; title: string;
  pass_mark?: number | null; duration_min?: number | null;
  question_count?: number | null;
};

type ResultRow = {
  id: number; user_id: number;
  student_name?: string | null; student_email?: string | null;
  score?: number | null; total_marks?: number | null;
  percentage?: number | null; passed?: boolean | null;
  attempt_no?: number | null; taken_at?: string | null;
};

export function ManageTestDialog({ test }: { test: TestRow }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [deleting, startDelete] = useTransition();

  // Prevent Base UI portal from causing server/client HTML mismatch.
  // Render a static placeholder until after first client paint.
  useEffect(() => { setMounted(true); }, []);

  async function load() {
    setLoading(true);
    const client = browserClient();
    const { data } = await (client as ReturnType<typeof browserClient>).GET(
      `/tests/${test.id}/results` as never, {} as never,
    );
    setResults(Array.isArray(data) ? (data as ResultRow[]) : []);
    setLoading(false);
  }

  function deleteTest() {
    if (!confirm(`Delete test "${test.title}"? This removes all results.`)) return;
    startDelete(async () => {
      const client = browserClient();
      const { error } = await (client as ReturnType<typeof browserClient>).DELETE(
        `/tests/${test.id}` as never, {} as never,
      );
      if (error) { toast.error('Failed to delete test.'); return; }
      toast.success('Test deleted');
      setOpen(false);
      router.refresh();
    });
  }

  const filtered = results.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (r.student_name ?? '').toLowerCase().includes(q) ||
           (r.student_email ?? '').toLowerCase().includes(q);
  });

  const passCount = results.filter(r => r.passed).length;
  const avgPct = results.length
    ? Math.round(results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / results.length)
    : 0;

  // Server / pre-hydration: render a plain static button so SSR HTML matches
  // the initial client render exactly (Base UI portals add dynamic IDs that
  // would otherwise cause React hydration error #418).
  if (!mounted) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" disabled>
        <Settings2 className="size-3.5" /> Manage
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) load(); }}>
      <DialogTrigger render={
        <Button size="sm" variant="outline" className="gap-1.5">
          <Settings2 className="size-3.5" /> Manage
        </Button>
      } />

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-3xl max-h-[88vh]">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <BarChart2 className="size-4 text-primary" />
            </div>
            {test.title}
          </DialogTitle>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Award className="size-3" /> Pass mark: {test.pass_mark ?? 60}%
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {test.duration_min ?? '—'} min
            </span>
            <span className="flex items-center gap-1">
              Questions: {test.question_count ?? 0}
            </span>
          </div>

          {/* Stats strip */}
          {!loading && results.length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {[
                { icon: Users, label: 'Attempts', val: results.length, cls: 'bg-muted' },
                { icon: CheckCircle2, label: 'Passed', val: passCount, cls: 'bg-emerald-100 text-emerald-700' },
                { icon: XCircle, label: 'Failed', val: results.length - passCount, cls: 'bg-red-100 text-red-600' },
                { icon: BarChart2, label: 'Avg score', val: `${avgPct}%`, cls: 'bg-blue-100 text-blue-700' },
              ].map(({ icon: Icon, label, val, cls }) => (
                <div key={label} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium', cls)}>
                  <Icon className="size-3.5" /> {label}: {val}
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          {!loading && results.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search by student name or email…" className="pl-8 h-8"
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading results…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <BarChart2 className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {query ? 'No results match your search.' : 'No submissions yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.student_name ?? `Student #${r.user_id}`}</div>
                      {r.student_email && (
                        <div className="text-[11px] text-muted-foreground">{r.student_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {r.score ?? 0} / {r.total_marks ?? '?'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full rounded-full', r.passed ? 'bg-emerald-500' : 'bg-red-400')}
                            style={{ width: `${Math.min(100, Number(r.percentage ?? 0))}%` }} />
                        </div>
                        <span className="text-xs font-medium">{Math.round(Number(r.percentage ?? 0))}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                          <CheckCircle2 className="size-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-600 px-2 py-0.5 text-[10px] font-semibold">
                          <XCircle className="size-3" /> Failed
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">#{r.attempt_no ?? 1}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmt(r.taken_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {loading ? '…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex gap-2">
            <Link href={`/tests/${test.id}/edit`} onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
              <Pencil className="size-3.5" /> Edit questions
            </Link>
            <Button variant="outline" size="sm"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              onClick={deleteTest} disabled={deleting}>
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete test
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

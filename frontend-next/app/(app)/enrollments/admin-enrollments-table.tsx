'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { browserClient } from '@/lib/api/client';

type EnrollmentRow = {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  course_id: number;
  course_title?: string | null;
  enrolled_at?: string | null;
  completed?: boolean | null;
  is_active?: boolean | null;
};

function fmtDate(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function AdminEnrollmentsTable({
  initialRows,
}: {
  initialRows: EnrollmentRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EnrollmentRow[]>(initialRows);
  const [query, setQuery] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        (r.user_name ?? '').toLowerCase().includes(q) ||
        (r.user_email ?? '').toLowerCase().includes(q) ||
        (r.course_title ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  function toggle(enrollment: EnrollmentRow) {
    setTogglingId(enrollment.id);
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await (client as ReturnType<typeof browserClient>).PATCH(
        `/enrollments/admin/${enrollment.id}/toggle` as never,
        {} as never,
      );
      setTogglingId(null);
      if (error) {
        toast.error('Failed to update enrollment.');
        return;
      }
      const updated = data as { id: number; is_active: boolean };
      setRows((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, is_active: updated.is_active } : r)),
      );
      toast.success(
        updated.is_active
          ? `Enrollment enabled for ${enrollment.user_name ?? 'user'}`
          : `Enrollment disabled for ${enrollment.user_name ?? 'user'}`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, email or course…"
          className="pl-8 h-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {query ? 'No enrollments match your search.' : 'No enrollments found.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const isToggling = togglingId === row.id && isPending;
              const active = row.is_active !== false;
              return (
                <TableRow key={row.id} className={cn(!active && 'opacity-60')}>
                  <TableCell>
                    <div className="font-medium text-sm">{row.user_name ?? `User #${row.user_id}`}</div>
                    {row.user_email ? (
                      <div className="text-[11px] text-muted-foreground">{row.user_email}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.course_title ?? `Course #${row.course_id}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(row.enrolled_at)}
                  </TableCell>
                  <TableCell>
                    {row.completed ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">In progress</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600',
                    )}>
                      <span className={cn(
                        'inline-block size-1.5 rounded-full',
                        active ? 'bg-emerald-500' : 'bg-red-500',
                      )} />
                      {active ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={active ? 'outline' : 'secondary'}
                      className={cn(
                        'h-7 gap-1.5 text-xs',
                        active
                          ? 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                          : 'text-emerald-700 hover:bg-emerald-50',
                      )}
                      disabled={isToggling}
                      onClick={() => toggle(row)}
                    >
                      {isToggling ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : active ? (
                        <ToggleLeft className="size-3.5" />
                      ) : (
                        <ToggleRight className="size-3.5" />
                      )}
                      {active ? 'Disable' : 'Enable'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length !== rows.length
          ? `Showing ${filtered.length} of ${rows.length} enrollments`
          : `${rows.length} total enrollment${rows.length !== 1 ? 's' : ''}`}
      </p>
    </div>
  );
}

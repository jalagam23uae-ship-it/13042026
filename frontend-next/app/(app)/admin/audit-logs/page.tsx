import Link from 'next/link';
import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

type AuditEntry = {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  action?: string | null;
  resource?: string | null;
  details?: string | null;
  created_at?: string | null;
  ip_address?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

const PAGE_SIZE = 50;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const action = params.action ?? '';
  const page = Math.max(1, Number(params.page ?? '1'));
  const offset = (page - 1) * PAGE_SIZE;

  const token = await getSessionToken();
  const client = serverClient(token);

  const [logsRes, actionsRes] = await Promise.all([
    client.GET('/audit/' as never, {
      params: {
        query: {
          ...(action ? { action } : {}),
          offset,
          limit: PAGE_SIZE,
        },
      },
    } as never),
    client.GET('/audit/actions' as never, {} as never as never as never),
  ]);

  // Backend may return array OR {items, total}. Handle both.
  const rawData = logsRes.data as unknown;
  let entries: AuditEntry[] = [];
  let total = 0;
  if (Array.isArray(rawData)) {
    entries = rawData as AuditEntry[];
    total = entries.length + (entries.length === PAGE_SIZE ? PAGE_SIZE : 0);
  } else if (rawData && typeof rawData === 'object') {
    const obj = rawData as { items?: AuditEntry[]; total?: number };
    entries = Array.isArray(obj.items) ? obj.items : [];
    total = Number(obj.total ?? entries.length);
  }
  const error = logsRes.error;

  const actionTypes = (Array.isArray(actionsRes.data) ? actionsRes.data : []) as string[];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function queryString(next: { action?: string; page?: number }) {
    const p = new URLSearchParams();
    if (next.action ?? action) p.set('action', next.action ?? action);
    if (next.page != null && next.page > 1) p.set('page', String(next.page));
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Chronological record of sensitive actions across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-muted-foreground" />
              Recent actions
            </CardTitle>
            <form className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Filter:</label>
              <select
                name="action"
                defaultValue={action}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">All actions</option>
                {actionTypes.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Apply
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load audit logs.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit records match your filter.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-mono">{fmt(entry.created_at)}</TableCell>
                      <TableCell>{entry.user_name ?? `#${entry.user_id ?? '?'}`}</TableCell>
                      <TableCell>
                        {entry.action ? <Badge variant="outline">{entry.action}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{entry.resource ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{entry.ip_address ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  {canPrev ? (
                    <Link
                      href={`/admin/audit-logs${queryString({ page: page - 1 })}`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1.5')}
                    >
                      <ChevronLeft className="size-3.5" />
                      Prev
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <ChevronLeft className="size-3.5" />
                      Prev
                    </Button>
                  )}
                  {canNext ? (
                    <Link
                      href={`/admin/audit-logs${queryString({ page: page + 1 })}`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1.5')}
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

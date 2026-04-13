import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2 } from 'lucide-react';
import { ApprovalActions } from './approval-actions';

type ApprovalRequest = {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  type?: string | null;
  resource?: string | null;
  status?: string | null;
  created_at?: string | null;
  message?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

export default async function AdminApprovalsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/approvals/pending', {});
  const requests = (Array.isArray(data) ? data : []) as ApprovalRequest[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Pending requests awaiting admin action.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            Pending ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load approvals.</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-xs">{fmt(req.created_at)}</TableCell>
                    <TableCell>{req.user_name ?? `#${req.user_id ?? '?'}`}</TableCell>
                    <TableCell>
                      {req.type ? <Badge variant="outline">{req.type}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{req.resource ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {req.status ?? 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ApprovalActions id={req.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

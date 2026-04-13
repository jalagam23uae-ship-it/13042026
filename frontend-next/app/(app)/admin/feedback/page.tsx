import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare } from 'lucide-react';

type FeedbackRow = {
  id: number;
  user_id: number;
  session_id: number;
  overall_rating?: number | null;
  instructor_rating?: number | null;
  content_rating?: number | null;
  pace_rating?: number | null;
  comments?: string | null;
  submitted_at?: string | null;
};

type UserRow = { id: number; name: string; email: string };

export default async function AdminFeedbackPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [fbRes, usersRes] = await Promise.all([
    client.GET('/feedback/all', {}),
    client.GET('/users/', {}),
  ]);

  const feedback = (Array.isArray(fbRes.data) ? fbRes.data : []) as FeedbackRow[];
  const users = (Array.isArray(usersRes.data) ? usersRes.data : []) as UserRow[];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const avg = (key: keyof FeedbackRow) => {
    const vals = feedback
      .map((f) => Number(f[key] ?? 0))
      .filter((v) => !Number.isNaN(v) && v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessageSquare className="size-5 text-muted-foreground" />
          Session feedback
        </h1>
        <p className="text-sm text-muted-foreground">
          All feedback submitted by students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Overall" value={avg('overall_rating')} />
        <Stat label="Instructor" value={avg('instructor_rating')} />
        <Stat label="Content" value={avg('content_rating')} />
        <Stat label="Pace" value={avg('pace_rating')} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All responses ({feedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No feedback submitted yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-right">Overall</TableHead>
                  <TableHead className="text-right">Instructor</TableHead>
                  <TableHead className="text-right">Content</TableHead>
                  <TableHead className="text-right">Pace</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="whitespace-nowrap">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map((f) => {
                  const user = userMap.get(f.user_id);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{user?.name ?? `#${f.user_id}`}</TableCell>
                      <TableCell>#{f.session_id}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.overall_rating ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.instructor_rating ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.content_rating ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.pace_rating ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {f.comments ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {f.submitted_at
                          ? new Date(f.submitted_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {value > 0 ? value.toFixed(1) : '—'}
        {value > 0 ? <span className="text-sm text-muted-foreground"> / 5</span> : null}
      </div>
    </div>
  );
}

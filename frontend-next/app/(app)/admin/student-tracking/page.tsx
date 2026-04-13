import Link from 'next/link';
import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Timer, ArrowRight } from 'lucide-react';

type StudentStat = {
  user_id: number;
  name?: string | null;
  email?: string | null;
  total_login_hours?: number | null;
  total_course_hours?: number | null;
  last_login?: string | null;
  courses_enrolled?: number | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function formatHours(h?: number | null) {
  if (h == null) return '—';
  return `${Number(h).toFixed(1)}h`;
}

export default async function AdminStudentTrackingPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/time-tracking/admin/all', {});
  const stats = (Array.isArray(data) ? data : []) as StudentStat[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Student Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Login time and course engagement per student.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-muted-foreground" />
            Time tracking ({stats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load stats.</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracking data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Login hours</TableHead>
                  <TableHead>Course hours</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.user_id}>
                    <TableCell className="font-medium">{stat.name ?? `#${stat.user_id}`}</TableCell>
                    <TableCell className="text-xs">{stat.email ?? '—'}</TableCell>
                    <TableCell>{stat.courses_enrolled ?? 0}</TableCell>
                    <TableCell>{formatHours(stat.total_login_hours)}</TableCell>
                    <TableCell>{formatHours(stat.total_course_hours)}</TableCell>
                    <TableCell className="text-xs">{fmt(stat.last_login)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/student-tracking/${stat.user_id}`}>
                        <Button size="sm" variant="ghost">
                          Details
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
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

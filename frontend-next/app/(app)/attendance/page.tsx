import { requireUser, getSessionToken } from '@/lib/auth/session';
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
import { CheckSquare, Clock, Flame, Timer } from 'lucide-react';
import { AttendanceHeatmap } from './_components/attendance-heatmap';
import { AdminAttendanceGrid } from './_components/admin-attendance-grid';

type AttendanceRow = {
  id: number;
  session_id?: number | null;
  session_title?: string | null;
  status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
};

type DailyAttendance = {
  date: string;
  present?: boolean;
  login_minutes?: number | null;
  course_minutes?: number | null;
};

type MyStats = {
  total_login_hours?: number | null;
  total_course_hours?: number | null;
  login_sessions_count?: number | null;
  current_streak?: number | null;
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  present: 'default',
  partial: 'secondary',
  absent: 'destructive',
  late: 'outline',
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

export default async function AttendancePage() {
  const user = await requireUser();
  const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [myResult, summaryResult, dailyResult, statsResult] = await Promise.all([
    client.GET('/attendance/my', {}),
    client.GET('/attendance/summary/me', {}),
    client.GET('/time-tracking/daily-attendance/me', {}),
    client.GET('/time-tracking/my-stats', {}),
  ]);
  const rows = (Array.isArray(myResult.data) ? myResult.data : []) as AttendanceRow[];
  const summary = summaryResult.data as
    | { total_sessions?: number; attended?: number; rate?: number }
    | undefined;
  const daily = (Array.isArray(dailyResult.data) ? dailyResult.data : []) as DailyAttendance[];
  const stats = (statsResult.data ?? {}) as MyStats;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Your session attendance and daily learning activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={CheckSquare}
          label="Sessions attended"
          value={`${summary?.attended ?? 0} / ${summary?.total_sessions ?? 0}`}
          hint={summary?.rate != null ? `${Math.round(Number(summary.rate))}% rate` : undefined}
        />
        <Stat
          icon={Clock}
          label="Login hours"
          value={`${Number(stats.total_login_hours ?? 0).toFixed(1)}h`}
          hint={stats.login_sessions_count ? `${stats.login_sessions_count} sessions` : undefined}
        />
        <Stat
          icon={Timer}
          label="Course hours"
          value={`${Number(stats.total_course_hours ?? 0).toFixed(1)}h`}
          hint="Study time"
        />
        <Stat
          icon={Flame}
          label="Current streak"
          value={`${stats.current_streak ?? 0} days`}
          hint="Consecutive active days"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily activity (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceHeatmap days={daily} />
        </CardContent>
      </Card>

      {isAdmin ? <AdminAttendanceGrid /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="size-4 text-muted-foreground" />
            Session check-in history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.session_title ?? `Session ${row.session_id ?? ''}`}
                    </TableCell>
                    <TableCell className="text-xs">{fmt(row.check_in)}</TableCell>
                    <TableCell className="text-xs">{fmt(row.check_out)}</TableCell>
                    <TableCell>
                      {row.status ? (
                        <Badge
                          variant={STATUS_VARIANT[row.status] ?? 'outline'}
                          className="capitalize"
                        >
                          {row.status}
                        </Badge>
                      ) : (
                        '—'
                      )}
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

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

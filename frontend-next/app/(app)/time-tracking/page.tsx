import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { asArray } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, LogIn, BookOpen, CalendarCheck } from 'lucide-react';

type Stats = {
  total_login_minutes: number;
  total_login_hours: number;
  session_count: number;
  last_login: string | null;
  total_course_minutes: number;
  total_course_hours: number;
  courses: Array<{
    course_id: number;
    course_title: string;
    total_minutes: number;
    total_hours: number;
    view_count: number;
  }>;
};

type DayRow = {
  date: string;
  sessions: number;
  login_minutes: number;
  course_minutes: number;
  present: boolean;
};

export default async function TimeTrackingPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const [statsRes, dailyRes] = await Promise.all([
    client.GET('/time-tracking/my-stats', {}),
    client.GET('/time-tracking/daily-attendance/me', { params: { query: { days: 30 } } }),
  ]);

  const stats = (statsRes.data ?? null) as Stats | null;
  const daily = asArray<DayRow>(dailyRes.data);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Clock className="size-5 text-muted-foreground" />
          Time tracking
        </h1>
        <p className="text-sm text-muted-foreground">
          How much time you&apos;ve spent learning on the platform.
        </p>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={LogIn}
            label="Total logged-in"
            value={`${stats.total_login_hours.toFixed(1)} h`}
            hint={`${stats.session_count} session${stats.session_count === 1 ? '' : 's'}`}
          />
          <StatCard
            icon={BookOpen}
            label="Time in courses"
            value={`${stats.total_course_hours.toFixed(1)} h`}
            hint={`${stats.total_course_minutes.toFixed(0)} minutes`}
          />
          <StatCard
            icon={CalendarCheck}
            label="Days active (30d)"
            value={String(daily.filter((d) => d.present).length)}
            hint="out of last 30"
          />
          <StatCard
            icon={Clock}
            label="Last login"
            value={stats.last_login ? new Date(stats.last_login).toLocaleDateString() : '—'}
            hint={stats.last_login ? new Date(stats.last_login).toLocaleTimeString() : 'Never'}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time by course</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.courses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.courses.map((c) => (
                    <TableRow key={c.course_id}>
                      <TableCell className="font-medium">{c.course_title}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.total_hours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.view_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No course time yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily activity (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                {daily.map((d) => (
                  <li
                    key={d.date}
                    className="flex items-center justify-between rounded-md border px-2 py-1"
                  >
                    <span className="text-muted-foreground">{d.date}</span>
                    {d.present ? (
                      <Badge variant="secondary">
                        {(d.login_minutes + d.course_minutes).toFixed(0)}m
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

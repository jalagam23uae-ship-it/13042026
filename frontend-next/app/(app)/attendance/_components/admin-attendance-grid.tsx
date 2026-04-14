import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { asArray } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type EngagementRow = {
  user_id: number;
  name?: string | null;
  email?: string | null;
  total_login_hours?: number | null;
  total_course_hours?: number | null;
  session_count?: number | null;
  last_login?: string | null;
};

type DailyStudentRow = {
  user_id: number;
  name?: string | null;
  email?: string | null;
  present_days?: number | null;
  total_days?: number | null;
  attendance_rate?: number | null;
  days?: Array<{
    date: string;
    present?: boolean | null;
    login_minutes?: number | null;
    course_minutes?: number | null;
    sessions?: number | null;
  }> | null;
};

type DailyResponse = {
  dates?: string[];
  students?: DailyStudentRow[];
};

function fmtDate(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function AdminAttendanceGrid() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [allRes, dailyRes] = await Promise.all([
    client.GET('/time-tracking/admin/all' as never, {} as never),
    client.GET('/time-tracking/admin/daily-attendance' as never, {
      params: { query: { days: 7 } },
    } as never),
  ]);

  const students = asArray<EngagementRow>(allRes.data);

  // daily response is { dates: string[], students: [...] }
  const dailyPayload = (dailyRes.data ?? {}) as DailyResponse;
  const dateHeaders: string[] = dailyPayload.dates ?? [];
  const dailyStudents = dailyPayload.students ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Student engagement summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student engagement summary</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Login hours</TableHead>
                  <TableHead>Course hours</TableHead>
                  <TableHead>Login sessions</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.name ?? `User ${s.user_id}`}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.email ?? '—'}</TableCell>
                    <TableCell>{Number(s.total_login_hours ?? 0).toFixed(1)}h</TableCell>
                    <TableCell>{Number(s.total_course_hours ?? 0).toFixed(1)}h</TableCell>
                    <TableCell className="text-xs">{s.session_count ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(s.last_login)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Daily attendance grid (last 7 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily attendance grid (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dailyStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium min-w-32">Student</th>
                  {dateHeaders.map((d) => (
                    <th key={d} className="p-2 text-center font-medium text-xs whitespace-nowrap">
                      {new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium text-xs">Rate</th>
                </tr>
              </thead>
              <tbody>
                {dailyStudents.map((row) => {
                  const byDate = new Map<string, { present?: boolean | null; login_minutes?: number | null }>();
                  (row.days ?? []).forEach((d) => byDate.set(d.date, d));
                  return (
                    <tr key={row.user_id} className="border-b">
                      <td className="p-2 font-medium">{row.name ?? `User ${row.user_id}`}</td>
                      {dateHeaders.map((d) => {
                        const entry = byDate.get(d);
                        const present = entry?.present;
                        const mins = entry?.login_minutes ?? 0;
                        return (
                          <td key={d} className="p-2 text-center">
                            <div
                              className={`mx-auto size-5 rounded ${
                                present
                                  ? 'bg-emerald-500'
                                  : mins > 0
                                    ? 'bg-emerald-200'
                                    : 'bg-muted'
                              }`}
                              title={entry ? `${mins} min login` : 'No activity'}
                            />
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-xs font-medium">
                        {row.attendance_rate != null ? `${row.attendance_rate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

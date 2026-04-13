import { getSessionToken } from '@/lib/auth/session';
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

type StudentRow = {
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  total_login_minutes?: number | null;
  total_course_minutes?: number | null;
  courses_enrolled?: number | null;
  courses_completed?: number | null;
  last_active?: string | null;
};

type DailyRow = {
  user_id: number;
  user_name?: string | null;
  daily?: Array<{
    date: string;
    login_minutes?: number | null;
    course_minutes?: number | null;
    present?: boolean | null;
  }> | null;
};

export async function AdminAttendanceGrid() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [allRes, dailyRes] = await Promise.all([
    client.GET('/time-tracking/admin/all' as never, {}),
    client.GET('/time-tracking/admin/daily-attendance' as never, {
      params: { query: { days: 7 } },
    } as never),
  ]);

  const students = (Array.isArray(allRes.data) ? allRes.data : []) as StudentRow[];
  const daily = (Array.isArray(dailyRes.data) ? dailyRes.data : []) as DailyRow[];

  const dateHeaders: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dateHeaders.push(d.toISOString().slice(0, 10));
  }

  const dailyByUser = new Map<number, DailyRow['daily']>();
  daily.forEach((d) => dailyByUser.set(d.user_id, d.daily ?? []));

  return (
    <div className="flex flex-col gap-6">
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
                  <TableHead>Courses</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.user_name ?? `User ${s.user_id}`}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.user_email ?? '—'}</TableCell>
                    <TableCell>{((s.total_login_minutes ?? 0) / 60).toFixed(1)}h</TableCell>
                    <TableCell>{((s.total_course_minutes ?? 0) / 60).toFixed(1)}h</TableCell>
                    <TableCell className="text-xs">
                      {s.courses_completed ?? 0} / {s.courses_enrolled ?? 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.last_active ? new Date(s.last_active).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily attendance grid (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">Student</th>
                  {dateHeaders.map((d) => (
                    <th key={d} className="p-2 text-center font-medium text-xs">
                      {new Date(d).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: '2-digit',
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => {
                  const byDate = new Map<string, { present?: boolean | null; login_minutes?: number | null }>();
                  (row.daily ?? []).forEach((d) => byDate.set(d.date, d));
                  return (
                    <tr key={row.user_id} className="border-b">
                      <td className="p-2 font-medium">{row.user_name ?? `User ${row.user_id}`}</td>
                      {dateHeaders.map((d) => {
                        const entry = byDate.get(d);
                        const present = entry?.present;
                        return (
                          <td key={d} className="p-2 text-center">
                            <div
                              className={`mx-auto size-4 rounded ${
                                present
                                  ? 'bg-primary'
                                  : entry && (entry.login_minutes ?? 0) > 0
                                    ? 'bg-primary/40'
                                    : 'bg-muted'
                              }`}
                              title={entry ? `${entry.login_minutes ?? 0} min` : 'No activity'}
                            />
                          </td>
                        );
                      })}
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

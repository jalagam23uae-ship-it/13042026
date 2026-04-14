import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, CheckCircle2, XCircle, BarChart2, RefreshCw, ClipboardList } from 'lucide-react';
import { CreateTestDialog } from './_components/create-test-dialog';
import { ManageTestDialog } from './_components/manage-test-dialog';

type MineStats = { best: number; passed: boolean; attempts: number };

type ResultRow = {
  id: number;
  test_id: number;
  test_title?: string | null;
  user_id?: number;
  student_name?: string | null;
  student_email?: string | null;
  score?: number | null;
  total_marks?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  attempt_no?: number | null;
  taken_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function TestsPage() {
  const user = await requireUser();
  const canManage = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'instructor';
  const canCreate = user.role?.toLowerCase() === 'admin';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [testsResult, adminCoursesResult, myResultsResult, allResultsResult] = await Promise.all([
    client.GET('/tests/', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses' as never, {} as never)
      : Promise.resolve({ data: [] as unknown }),
    !canManage
      ? client.GET('/results/me' as never, {} as never)
      : Promise.resolve({ data: [] as unknown }),
    canManage
      ? client.GET('/results/all' as never, {} as never)
      : Promise.resolve({ data: [] as unknown }),
  ]);

  const tests = (Array.isArray(testsResult.data) ? testsResult.data : []) as Array<{
    id: number;
    title: string;
    course_id?: number | null;
    pass_mark?: number | null;
    duration_min?: number | null;
    question_count?: number | null;
  }>;
  const adminCourses = (
    Array.isArray(adminCoursesResult.data) ? adminCoursesResult.data : []
  ) as Array<{ id: number; title: string }>;
  const myResults = (Array.isArray(myResultsResult.data) ? myResultsResult.data : []) as ResultRow[];
  const allResults = (Array.isArray(allResultsResult.data) ? allResultsResult.data : []) as ResultRow[];
  const error = testsResult.error;

  // Student best-per-test map
  const bestMap = new Map<number, MineStats>();
  for (const r of myResults) {
    const pct = Number(r.percentage ?? 0);
    const prev = bestMap.get(r.test_id);
    bestMap.set(r.test_id, {
      best: prev ? Math.max(prev.best, pct) : pct,
      passed: (prev?.passed ?? false) || !!r.passed,
      attempts: (prev?.attempts ?? 0) + 1,
    });
  }

  // Admin stats
  const totalAttempts = allResults.length;
  const totalPassed = allResults.filter((r) => r.passed).length;
  const avgPct = allResults.length
    ? Math.round(allResults.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / allResults.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? 'Manage tests and view all student submissions.' : 'Tests available for your enrolled courses.'}
          </p>
        </div>
        {canCreate && <CreateTestDialog courses={adminCourses} />}
      </div>

      {/* ── Admin summary strip ───────────────────────────────── */}
      {canManage && allResults.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total attempts', value: totalAttempts, color: 'bg-blue-100 text-blue-700' },
            { label: 'Passed', value: totalPassed, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Failed', value: totalAttempts - totalPassed, color: 'bg-red-100 text-red-600' },
            { label: 'Avg score', value: `${avgPct}%`, color: 'bg-muted text-foreground' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2', color)}>
              <span>{label}</span>
              <span className="text-base font-bold">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tests table ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available tests</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load tests.</p>
          ) : tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Pass mark</TableHead>
                  {!canManage && <TableHead>Best score</TableHead>}
                  {!canManage && <TableHead>Attempts</TableHead>}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const mine = bestMap.get(test.id);
                  const canTake = (test.question_count ?? 0) > 0;
                  return (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>
                        {test.question_count != null ? test.question_count : '—'}
                      </TableCell>
                      <TableCell>
                        {test.duration_min ? `${test.duration_min} min` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{test.pass_mark ?? '—'}%</Badge>
                      </TableCell>
                      {!canManage && (
                        <TableCell>
                          {mine ? (
                            <Badge variant={mine.passed ? 'default' : 'outline'} className={mine.passed ? 'bg-emerald-500 hover:bg-emerald-500' : ''}>
                              {Math.round(mine.best)}%
                            </Badge>
                          ) : '—'}
                        </TableCell>
                      )}
                      {!canManage && (
                        <TableCell>{mine?.attempts ?? 0}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && <ManageTestDialog test={test} />}
                          {!canManage && (
                            canTake ? (
                              <Link
                                href={`/tests/${test.id}`}
                                className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
                              >
                                {mine ? <RefreshCw className="size-3.5" /> : <Play className="size-3.5" />}
                                {mine ? 'Retry' : 'Start'}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No questions yet</span>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Admin: all submissions history ───────────────────── */}
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <BarChart2 className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">All Submissions</CardTitle>
                <CardDescription>Every test attempt by every student — full history.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allResults.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <ClipboardList className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.student_name ?? `User #${r.user_id}`}</div>
                        {r.student_email && (
                          <div className="text-[11px] text-muted-foreground">{r.student_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.test_title ?? `Test #${r.test_id}`}</TableCell>
                      <TableCell className="font-semibold text-sm">
                        {r.score ?? 0} / {r.total_marks ?? '?'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', r.passed ? 'bg-emerald-500' : 'bg-red-400')}
                              style={{ width: `${Math.min(100, Number(r.percentage ?? 0))}%` }}
                            />
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
          </CardContent>
        </Card>
      )}

      {/* ── Student: my attempt history ──────────────────────── */}
      {!canManage && myResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My attempt history</CardTitle>
            <CardDescription>All your previous test submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.test_title ?? `Test #${r.test_id}`}</TableCell>
                    <TableCell className="font-semibold text-sm">
                      {r.score ?? 0} / {r.total_marks ?? '?'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', r.passed ? 'bg-emerald-500' : 'bg-red-400')}
                            style={{ width: `${Math.min(100, Number(r.percentage ?? 0))}%` }}
                          />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, ClipboardList, BarChart2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ExportReportsButton } from './_components/export-button';

type LessonDropoff = {
  course: string;
  lessons: Array<{ title: string; sort_order: number; started: number; completed: number }>;
};
type TestResult = {
  id: number; test_id: number; user_id: number;
  test_title?: string | null; student_name?: string | null; student_email?: string | null;
  score?: number | null; total_marks?: number | null;
  percentage?: number | null; passed?: boolean | null;
  attempt_no?: number | null; taken_at?: string | null;
};
type SubResult = {
  id: number; assignment_id: number; user_id: number;
  assignment_title?: string | null; max_score?: number | null;
  student_name?: string | null; student_email?: string | null;
  score?: number | null; graded?: boolean | null; submitted_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminReportsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const [dropoffRes, testResultsRes, subsRes] = await Promise.all([
    client.GET('/analytics/lesson-dropoff' as never, {} as never),
    client.GET('/results/all' as never, {} as never),
    client.GET('/assignments/all-submissions' as never, {} as never),
  ]);

  const reports = (Array.isArray(dropoffRes.data) ? dropoffRes.data : []) as LessonDropoff[];
  const testResults = (Array.isArray(testResultsRes.data) ? testResultsRes.data : []) as TestResult[];
  const submissions = (Array.isArray(subsRes.data) ? subsRes.data : []) as SubResult[];

  const passedTests = testResults.filter((r) => r.passed).length;
  const gradedSubs = submissions.filter((s) => s.graded).length;
  const pendingSubs = submissions.filter((s) => !s.graded).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Audit</h1>
          <p className="text-sm text-muted-foreground">
            Test results, assignment submissions, and lesson engagement data.
          </p>
        </div>
        <ExportReportsButton reports={reports} />
      </div>

      {/* ── Test Results Audit ─────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Test Results</h2>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {passedTests} passed
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="size-3 text-red-500" />
              {testResults.length - passedTests} failed
            </span>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            {testResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No test submissions yet.</p>
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
                  {testResults.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.student_name ?? `User #${r.user_id}`}</div>
                        {r.student_email && (
                          <div className="text-[11px] text-muted-foreground">{r.student_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.test_title ?? `Test #${r.test_id}`}</TableCell>
                      <TableCell className="tabular-nums">
                        {r.score ?? 0} / {r.total_marks ?? '?'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${r.passed ? 'bg-emerald-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, Number(r.percentage ?? 0))}%` }} />
                          </div>
                          <span className="text-xs font-medium tabular-nums">
                            {Math.round(Number(r.percentage ?? 0))}%
                          </span>
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
      </section>

      {/* ── Assignment Submissions Audit ───────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Assignment Submissions</h2>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {gradedSubs} graded
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-amber-500" />
              {pendingSubs} pending
            </span>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            {submissions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{s.student_name ?? `User #${s.user_id}`}</div>
                        {s.student_email && (
                          <div className="text-[11px] text-muted-foreground">{s.student_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.assignment_title ?? `Assignment #${s.assignment_id}`}</TableCell>
                      <TableCell className="tabular-nums">
                        {s.score != null
                          ? `${s.score}${s.max_score ? ` / ${s.max_score}` : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.graded ? 'default' : 'secondary'}>
                          {s.graded ? 'Graded' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmt(s.submitted_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Lesson Drop-off ────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Lesson Engagement</h2>
        </div>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No engagement data yet.</CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.course}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="size-3.5 text-muted-foreground" />
                  {report.course}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Lesson</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Drop-off</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.lessons.map((lesson) => {
                      const dropoff = lesson.started > 0
                        ? Math.round(((lesson.started - lesson.completed) / lesson.started) * 100)
                        : 0;
                      return (
                        <TableRow key={`${report.course}-${lesson.sort_order}`}>
                          <TableCell>{lesson.sort_order}</TableCell>
                          <TableCell className="font-medium">{lesson.title}</TableCell>
                          <TableCell>{lesson.started}</TableCell>
                          <TableCell>{lesson.completed}</TableCell>
                          <TableCell>
                            <Badge variant={dropoff > 50 ? 'destructive' : dropoff > 20 ? 'secondary' : 'outline'}>
                              {dropoff}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

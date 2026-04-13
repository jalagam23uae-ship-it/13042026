import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil, Play } from 'lucide-react';
import { CreateTestForm } from './create-test-form';

type MineStats = { best: number; passed: boolean; attempts: number };

export default async function TestsPage() {
  const user = await requireUser();
  const canCreate = user.role === 'admin';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [testsResult, adminCoursesResult, myResultsResult] = await Promise.all([
    client.GET('/tests/', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses', {})
      : Promise.resolve({ data: [] as unknown }),
    client.GET('/results/me', {}),
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
  const myResults = (Array.isArray(myResultsResult.data) ? myResultsResult.data : []) as Array<{
    test_id: number;
    percentage?: number | null;
    passed?: boolean | null;
  }>;
  const error = testsResult.error;

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
        <p className="text-sm text-muted-foreground">Tests available for your enrolled courses.</p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New test</CardTitle>
            <CardDescription>Admin only.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTestForm courses={adminCourses} />
          </CardContent>
        </Card>
      ) : null}

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
                  <TableHead>Best score</TableHead>
                  <TableHead>Attempts</TableHead>
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
                      <TableCell>{test.question_count ?? '—'}</TableCell>
                      <TableCell>
                        {test.duration_min ? `${test.duration_min} min` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{test.pass_mark ?? '—'}%</Badge>
                      </TableCell>
                      <TableCell>
                        {mine ? (
                          <Badge variant={mine.passed ? 'default' : 'outline'}>
                            {Math.round(mine.best)}%
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{mine?.attempts ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canCreate ? (
                            <Link
                              href={`/tests/${test.id}/edit`}
                              className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                            >
                              <Pencil />
                              Edit
                            </Link>
                          ) : null}
                          {canTake ? (
                            <Link
                              href={`/tests/${test.id}`}
                              className={cn(buttonVariants({ size: 'sm' }))}
                            >
                              <Play />
                              {mine ? 'Retry' : 'Start'}
                            </Link>
                          ) : (
                            !canCreate ? (
                              <span className="text-xs text-muted-foreground">Empty</span>
                            ) : null
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
    </div>
  );
}

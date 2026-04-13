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
import { FileText } from 'lucide-react';
import { ExportReportsButton } from './export-button';

type LessonDropoff = {
  course: string;
  lessons: Array<{
    title: string;
    sort_order: number;
    started: number;
    completed: number;
  }>;
};

export default async function AdminReportsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data } = await client.GET('/analytics/lesson-dropoff', {});
  const reports = (Array.isArray(data) ? data : []) as LessonDropoff[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Lesson-level drop-off per course — where students stop engaging.
          </p>
        </div>
        <ExportReportsButton reports={reports} />
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No data yet.
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.course}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-muted-foreground" />
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
                    const dropoff =
                      lesson.started > 0
                        ? Math.round(
                            ((lesson.started - lesson.completed) / lesson.started) * 100,
                          )
                        : 0;
                    return (
                      <TableRow key={`${report.course}-${lesson.sort_order}`}>
                        <TableCell>{lesson.sort_order}</TableCell>
                        <TableCell className="font-medium">{lesson.title}</TableCell>
                        <TableCell>{lesson.started}</TableCell>
                        <TableCell>{lesson.completed}</TableCell>
                        <TableCell>{dropoff}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

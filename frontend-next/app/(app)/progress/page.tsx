import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

type Enrollment = {
  course_id?: number;
  course_title?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
};

export default async function ProgressPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/enrollments/my', {});
  const enrollments = (Array.isArray(data) ? data : []) as Enrollment[];
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completed).length;
  const avgProgress =
    totalCourses > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + Number(e.progress_pct ?? 0), 0) / totalCourses,
        )
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Progress</h1>
        <p className="text-sm text-muted-foreground">
          Track completion across every course you&apos;re enrolled in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Courses enrolled" value={String(totalCourses)} />
        <Summary label="Courses completed" value={String(completedCourses)} />
        <Summary label="Average progress" value={`${avgProgress}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-muted-foreground" />
            Per-course progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="text-sm text-destructive">Failed to load progress.</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Enroll in a course to start tracking progress.
            </p>
          ) : (
            enrollments.map((enrollment) => {
              const pct = Math.round(Number(enrollment.progress_pct ?? 0));
              return (
                <div key={enrollment.course_id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{enrollment.course_title ?? 'Untitled'}</span>
                    {enrollment.completed ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge>{pct}%</Badge>
                    )}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                  {enrollment.total_lessons != null ? (
                    <p className="text-xs text-muted-foreground">
                      {enrollment.completed_lessons ?? 0} / {enrollment.total_lessons} lessons
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

import { requireUser, getSessionToken, isManager } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';
import { StudentProgressTable } from './_components/student-progress-table';

type Enrollment = {
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  course_id?: number;
  course_title?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
};

export default async function ProgressPage() {
  const user = await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const isStaff =
    isManager(user);

  /* ── Admin / Instructor: all students ─────────────────────── */
  if (isStaff) {
    const { data } = await client.GET('/enrollments/all' as never, {} as never);
    const rows = (Array.isArray(data) ? data : []) as Enrollment[];

    // Group by user_id
    const byUser = new Map<
      number,
      { name: string; email: string; courses: Enrollment[] }
    >();
    for (const row of rows) {
      const uid = row.user_id ?? 0;
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          name: row.user_name ?? `User #${uid}`,
          email: row.user_email ?? '',
          courses: [],
        });
      }
      byUser.get(uid)!.courses.push(row);
    }

    const students = Array.from(byUser.entries()).map(([uid, { name, email, courses }]) => {
      const enrolled = courses.length;
      const completed = courses.filter((c) => c.completed).length;
      const avgPct =
        enrolled > 0
          ? Math.round(
              courses.reduce((sum, c) => sum + Number(c.progress_pct ?? 0), 0) /
                enrolled,
            )
          : 0;
      return {
        user_id: uid,
        name,
        email,
        courses: courses.map((c) => ({
          course_id: c.course_id ?? 0,
          course_title: c.course_title,
          progress_pct: c.progress_pct,
          completed: c.completed,
        })),
        enrolled,
        completed,
        avgPct,
      };
    });

    const totalStudents = students.length;
    const totalEnrollments = rows.length;
    const completedAll = rows.filter((r) => r.completed).length;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Progress</h1>
          <p className="text-sm text-muted-foreground">
            Course completion overview for every enrolled student.
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Students tracked" value={String(totalStudents)} icon={Users} />
          <SummaryCard label="Total enrollments" value={String(totalEnrollments)} icon={Trophy} />
          <SummaryCard
            label="Completions"
            value={String(completedAll)}
            icon={Trophy}
            hint={totalEnrollments > 0 ? `${Math.round((completedAll / totalEnrollments) * 100)}% rate` : undefined}
          />
        </div>

        <StudentProgressTable students={students} />
      </div>
    );
  }

  /* ── Student: own progress ─────────────────────────────────── */
  const { data, error } = await client.GET('/enrollments/my', {});
  const enrollments = (Array.isArray(data) ? data : []) as Enrollment[];
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completed).length;
  const avgProgress =
    totalCourses > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + Number(e.progress_pct ?? 0), 0) /
            totalCourses,
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

function SummaryCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Trophy;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

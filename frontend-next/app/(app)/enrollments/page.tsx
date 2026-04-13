import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap } from 'lucide-react';
import { EnrollmentBrowser } from './enrollment-browser';
import { UnenrollButton } from './unenroll-button';

type AvailableCourse = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  total_lessons?: number | null;
  total_duration_min?: number | null;
  is_enrolled?: boolean | null;
  thumbnail_url?: string | null;
};

type MyEnrollment = {
  id?: number;
  enrollment_id?: number;
  course_id?: number;
  course_title?: string | null;
  course_description?: string | null;
  category?: string | null;
  progress_pct?: number | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
  completed?: boolean | null;
  enrolled_at?: string | null;
};

type WishlistItem = { course_id: number };

export default async function EnrollmentsPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const [available, mine, wishlist, categoriesResult] = await Promise.all([
    client.GET('/enrollments/courses', {}),
    client.GET('/enrollments/my', {}),
    client.GET('/wishlist/', {}),
    client.GET('/enrollments/categories', {}),
  ]);

  const courses = (Array.isArray(available.data) ? available.data : []) as AvailableCourse[];
  const myEnrollments = (Array.isArray(mine.data) ? mine.data : []) as MyEnrollment[];
  const wishlistItems = (Array.isArray(wishlist.data) ? wishlist.data : []) as WishlistItem[];
  const wishlistIds = new Set(wishlistItems.map((w) => w.course_id));
  const categories = (
    Array.isArray(categoriesResult.data) ? categoriesResult.data : []
  ) as string[];

  const enrolledCount = myEnrollments.length;
  const completedCount = myEnrollments.filter((e) => e.completed).length;
  const availableCount = courses.filter((c) => !c.is_enrolled).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enrollments</h1>
        <p className="text-sm text-muted-foreground">
          Manage your enrolled courses and browse the full catalog.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={GraduationCap} label="Enrolled courses" value={enrolledCount} />
        <Metric icon={BookOpen} label="Completed" value={completedCount} />
        <Metric icon={BookOpen} label="Available to enroll" value={availableCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My enrollments</CardTitle>
          <CardDescription>Courses you are currently enrolled in.</CardDescription>
        </CardHeader>
        <CardContent>
          {myEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myEnrollments.map((enrollment) => {
                const pct = Math.round(Number(enrollment.progress_pct ?? 0));
                const enrollmentId = enrollment.enrollment_id ?? enrollment.id;
                return (
                  <div
                    key={String(enrollmentId ?? enrollment.course_id)}
                    className="flex flex-col gap-2 rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {enrollment.course_title ?? 'Untitled'}
                      </span>
                      {enrollment.completed ? (
                        <Badge variant="secondary">Done</Badge>
                      ) : (
                        <Badge>{pct}%</Badge>
                      )}
                    </div>
                    {enrollment.category ? (
                      <div className="text-[10px] text-muted-foreground">{enrollment.category}</div>
                    ) : null}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span>
                        {enrollment.completed_lessons ?? 0} / {enrollment.total_lessons ?? 0} lessons
                      </span>
                      {enrollmentId != null ? (
                        <UnenrollButton
                          enrollmentId={enrollmentId}
                          title={enrollment.course_title ?? 'course'}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrollmentBrowser
        courses={courses}
        categories={categories}
        wishlistIds={Array.from(wishlistIds)}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

import Link from 'next/link';
import { requireUser, getSessionToken, isManager } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BookOpen, Users } from 'lucide-react';
import { ReviewForm } from './_components/review-form';

type Enrollment = {
  id: number;
  course_id: number;
  course_title?: string | null;
  completed?: boolean | null;
};

type CourseReviews = {
  avg_rating: number;
  total_reviews: number;
  reviews: Array<{
    id: number;
    user_id: number;
    course_id: number;
    rating: number;
    comment?: string | null;
    created_at?: string | null;
    author_name?: string;
  }>;
};

type AllReview = {
  id: number;
  user_id: number;
  course_id: number;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
  author_name?: string;
  course_title?: string;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-3 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  );
}

function fmtDate(dt?: string | null) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function ReviewsPage() {
  const user = await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const isStaff = isManager(user);

  /* ── Admin / Instructor view ──────────────────────────────── */
  if (isStaff) {
    const { data } = await client.GET('/reviews/all' as never, {} as never);
    const allReviews = (Array.isArray(data) ? data : []) as AllReview[];

    // Group by course
    const byCourse = new Map<number, { title: string; reviews: AllReview[] }>();
    for (const r of allReviews) {
      if (!byCourse.has(r.course_id)) {
        byCourse.set(r.course_id, { title: r.course_title ?? `Course #${r.course_id}`, reviews: [] });
      }
      byCourse.get(r.course_id)!.reviews.push(r);
    }

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Star className="size-5 text-amber-400 fill-amber-400" />
            Course Reviews
          </h1>
          <p className="text-sm text-muted-foreground">
            All student reviews across every course. Read-only.
          </p>
        </div>

        {/* Summary strip */}
        <div className="flex gap-4">
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100">
              <Star className="size-4 text-amber-600 fill-amber-500" />
            </div>
            <div>
              <div className="text-xl font-bold">
                {allReviews.length > 0
                  ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
                  : '—'}
              </div>
              <p className="text-[11px] text-muted-foreground">Avg rating</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold">{allReviews.length}</div>
              <p className="text-[11px] text-muted-foreground">Total reviews</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100">
              <BookOpen className="size-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold">{byCourse.size}</div>
              <p className="text-[11px] text-muted-foreground">Courses reviewed</p>
            </div>
          </div>
        </div>

        {allReviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No reviews submitted yet.
            </CardContent>
          </Card>
        ) : (
          Array.from(byCourse.entries()).map(([courseId, { title, reviews }]) => {
            const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
            return (
              <Card key={courseId}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-0.5">
                        <StarRow rating={Math.round(avg)} />
                        <span>{avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{reviews.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border bg-muted/30 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.author_name ?? 'Unknown'}</span>
                          <StarRow rating={r.rating} />
                          <span className="text-xs text-muted-foreground">{r.rating}/5</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{fmtDate(r.created_at)}</span>
                      </div>
                      {r.comment ? (
                        <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  /* ── Student view ─────────────────────────────────────────── */
  const { data: enrollmentsData } = await client.GET('/enrollments/my' as never, {} as never);
  const enrollments = (Array.isArray(enrollmentsData) ? enrollmentsData : []) as Enrollment[];

  const courseReviews = await Promise.all(
    enrollments.map(async (enr) => {
      const { data } = await client.GET('/reviews/course/{course_id}' as never, {
        params: { path: { course_id: enr.course_id } },
      } as never);
      const reviews = (data ?? { avg_rating: 0, total_reviews: 0, reviews: [] }) as CourseReviews;
      const mine = reviews.reviews.find((r) => r.user_id === user.id) ?? null;
      return { enrollment: enr, summary: reviews, mine };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Star className="size-5 text-muted-foreground" />
          Course Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Share feedback about the courses you&apos;re enrolled in.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You&apos;re not enrolled in any courses yet.{' '}
            <Link href="/enrollments" className="underline underline-offset-2">
              Browse the catalog
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {courseReviews.map(({ enrollment, summary, mine }) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {enrollment.course_title ?? `Course #${enrollment.course_id}`}
                    </CardTitle>
                    <CardDescription>
                      {summary.total_reviews > 0
                        ? `${summary.avg_rating.toFixed(1)} ★ · ${summary.total_reviews} review${summary.total_reviews === 1 ? '' : 's'}`
                        : 'No reviews yet'}
                    </CardDescription>
                  </div>
                  <Link
                    href={`/courses/${enrollment.course_id}`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Open course
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ReviewForm
                  courseId={enrollment.course_id}
                  initialRating={mine?.rating ?? 0}
                  initialComment={mine?.comment ?? ''}
                  reviewId={mine?.id ?? null}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

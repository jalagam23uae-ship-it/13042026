import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { ReviewForm } from './review-form';

type Enrollment = {
  id: number;
  course_id: number;
  course_title?: string | null;
  completed?: boolean | null;
  completion_pct?: number | null;
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

export default async function ReviewsPage() {
  const user = await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data: enrollmentsData } = await client.GET('/enrollments/my', {});
  const enrollments = (Array.isArray(enrollmentsData) ? enrollmentsData : []) as Enrollment[];

  // Fetch reviews for each enrolled course, then filter to "mine" where possible.
  const courseReviews = await Promise.all(
    enrollments.map(async (enr) => {
      const { data } = await client.GET('/reviews/course/{course_id}', {
        params: { path: { course_id: enr.course_id } },
      });
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
          Course reviews
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

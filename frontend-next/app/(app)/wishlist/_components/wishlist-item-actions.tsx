'use client';

import { Loader2, GraduationCap, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function WishlistItemActions({
  wishlistId,
  courseId,
}: {
  wishlistId: number;
  courseId: number;
}) {
  const { mutate: enroll, isPending: isEnrolling } = useApiMutation(
    async () => {
      const client = browserClient();
      const result = await client.POST('/enrollments/' as never, {
        body: { course_id: courseId } as never,
      } as never);
      if (!result.error) {
        // Remove from wishlist after successful enrollment (fire-and-forget).
        await client.DELETE('/wishlist/{wishlist_id}' as never, {
          params: { path: { wishlist_id: wishlistId } },
        } as never);
      }
      return result as { data?: unknown; error?: unknown };
    },
    {
      successMessage: 'Enrolled — course moved to My Courses',
      errorMessage: 'Failed to enroll',
    },
  );

  const { mutate: remove, isPending: isRemoving } = useApiMutation(
    () =>
      browserClient().DELETE('/wishlist/{wishlist_id}' as never, {
        params: { path: { wishlist_id: wishlistId } },
      } as never),
    {
      successMessage: 'Removed from wishlist',
      errorMessage: 'Failed to remove from wishlist',
    },
  );

  const isPending = isEnrolling || isRemoving;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => enroll(undefined)}
        disabled={isPending}
        className="flex-1"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <GraduationCap className="size-3.5" />
        )}
        Enroll
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => remove(undefined)}
        disabled={isPending}
        aria-label="Remove from wishlist"
      >
        <HeartOff className="size-3.5" />
      </Button>
    </div>
  );
}

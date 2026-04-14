'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, GraduationCap, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function WishlistItemActions({
  wishlistId,
  courseId,
}: {
  wishlistId: number;
  courseId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function enroll() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/enrollments/' as never, {
        body: { course_id: courseId } as never,
      } as never);
      if (error) {
        toast.error('Failed to enroll');
        return;
      }
      // Remove from wishlist after successful enrollment
      await client.DELETE('/wishlist/{wishlist_id}' as never, {
        params: { path: { wishlist_id: wishlistId } },
      } as never);
      toast.success('Enrolled — course moved to My Courses');
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/wishlist/{wishlist_id}' as never, {
        params: { path: { wishlist_id: wishlistId } },
      } as never);
      if (error) {
        toast.error('Failed to remove from wishlist');
        return;
      }
      toast.success('Removed from wishlist');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={enroll} disabled={isPending} className="flex-1">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <GraduationCap className="size-3.5" />}
        Enroll
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={isPending}
        aria-label="Remove from wishlist"
      >
        <HeartOff className="size-3.5" />
      </Button>
    </div>
  );
}

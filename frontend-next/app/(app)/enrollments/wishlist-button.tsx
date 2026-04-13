'use client';

import { useState, useTransition } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function WishlistButton({
  courseId,
  initiallyWished,
  onToggle,
}: {
  courseId: number;
  initiallyWished: boolean;
  onToggle?: (wished: boolean) => void;
}) {
  const [wished, setWished] = useState(initiallyWished);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const client = browserClient();
      if (wished) {
        const { error } = await client.DELETE('/wishlist/{course_id}', {
          params: { path: { course_id: courseId } },
        });
        if (error) {
          toast.error('Failed to remove from wishlist.');
          return;
        }
        setWished(false);
        onToggle?.(false);
      } else {
        const { error } = await client.POST('/wishlist/{course_id}', {
          params: { path: { course_id: courseId } },
        });
        if (error) {
          toast.error('Failed to add to wishlist.');
          return;
        }
        setWished(true);
        onToggle?.(true);
      }
    });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggle}
      disabled={isPending}
      className="size-6"
      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isPending ? (
        <Loader2 className="animate-spin size-3.5" />
      ) : (
        <Heart className={wished ? 'fill-primary text-primary size-3.5' : 'size-3.5'} />
      )}
    </Button>
  );
}

'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

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

  const { mutate: add, isPending: isAdding } = useApiMutation(
    () =>
      browserClient().POST('/wishlist/{course_id}', {
        params: { path: { course_id: courseId } },
      }),
    {
      errorMessage: 'Failed to add to wishlist.',
      onSuccess: () => {
        setWished(true);
        onToggle?.(true);
      },
      refresh: false,
    },
  );

  const { mutate: remove, isPending: isRemoving } = useApiMutation(
    () =>
      browserClient().DELETE('/wishlist/{course_id}', {
        params: { path: { course_id: courseId } },
      }),
    {
      errorMessage: 'Failed to remove from wishlist.',
      onSuccess: () => {
        setWished(false);
        onToggle?.(false);
      },
      refresh: false,
    },
  );

  const isPending = isAdding || isRemoving;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={() => (wished ? remove(undefined) : add(undefined))}
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

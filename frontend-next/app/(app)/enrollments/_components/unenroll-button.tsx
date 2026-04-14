'use client';

import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function UnenrollButton({
  enrollmentId,
  title,
}: {
  enrollmentId: number;
  title: string;
}) {
  const { mutate: drop, isPending } = useApiMutation(
    () =>
      browserClient().DELETE('/enrollments/{enrollment_id}', {
        params: { path: { enrollment_id: enrollmentId } },
      }),
    {
      successMessage: 'Dropped',
      errorMessage: 'Failed to drop.',
    },
  );

  function handleClick() {
    if (!window.confirm(`Drop enrollment in "${title}"? Your progress will be kept.`))
      return;
    drop(undefined);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="h-6 px-2 text-[10px]"
    >
      {isPending ? <Loader2 className="animate-spin size-3" /> : <X className="size-3" />}
      Drop
    </Button>
  );
}

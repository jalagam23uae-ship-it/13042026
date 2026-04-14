'use client';

import { Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function EnrollPathButton({
  pathId,
  enrolled,
}: {
  pathId: number;
  enrolled: boolean;
}) {
  const { mutate: enroll, isPending } = useApiMutation(
    () =>
      browserClient().POST('/learning-paths/enroll/{path_id}' as never, {
        params: { path: { path_id: pathId } },
      } as never),
    {
      successMessage: 'Enrolled in learning path — all courses added',
      errorMessage: 'Failed to enroll in learning path',
    },
  );

  if (enrolled) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        <Check className="size-3.5" />
        Enrolled
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => enroll(undefined)}
      disabled={isPending}
      className="w-full"
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
      Enroll in path
    </Button>
  );
}

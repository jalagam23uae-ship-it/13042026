'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function EnrollButton({
  courseId,
  alreadyEnrolled,
}: {
  courseId: number;
  alreadyEnrolled: boolean;
}) {
  const [enrolled, setEnrolled] = useState(alreadyEnrolled);

  const { mutate: enroll, isPending } = useApiMutation(
    () =>
      browserClient().POST('/enrollments/', {
        body: { course_id: courseId } as never,
      }),
    {
      successMessage: 'Enrolled successfully',
      errorMessage: 'Failed to enroll in this course.',
      onSuccess: () => setEnrolled(true),
    },
  );

  if (enrolled) {
    return (
      <Button variant="secondary" size="sm" disabled className="w-full">
        Enrolled
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => enroll(undefined)}
    >
      {isPending ? <Loader2 className="animate-spin" /> : null}
      Enroll
    </Button>
  );
}

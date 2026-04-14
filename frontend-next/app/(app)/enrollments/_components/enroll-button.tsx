'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function EnrollButton({
  courseId,
  alreadyEnrolled,
}: {
  courseId: number;
  alreadyEnrolled: boolean;
}) {
  const [enrolled, setEnrolled] = useState(alreadyEnrolled);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
      onClick={() => {
        startTransition(async () => {
          const client = browserClient();
          const { error } = await client.POST('/enrollments/', {
            body: { course_id: courseId } as never,
          });
          if (error) {
            toast.error('Failed to enroll in this course.');
            return;
          }
          setEnrolled(true);
          toast.success('Enrolled successfully');
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : null}
      Enroll
    </Button>
  );
}

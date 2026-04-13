'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function UnenrollButton({
  enrollmentId,
  title,
}: {
  enrollmentId: number;
  title: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function drop() {
    if (!window.confirm(`Drop enrollment in "${title}"? Your progress will be kept.`))
      return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/enrollments/{enrollment_id}', {
        params: { path: { enrollment_id: enrollmentId } },
      });
      if (error) {
        toast.error('Failed to drop.');
        return;
      }
      toast.success('Dropped');
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={drop}
      disabled={isPending}
      className="h-6 px-2 text-[10px]"
    >
      {isPending ? <Loader2 className="animate-spin size-3" /> : <X className="size-3" />}
      Drop
    </Button>
  );
}

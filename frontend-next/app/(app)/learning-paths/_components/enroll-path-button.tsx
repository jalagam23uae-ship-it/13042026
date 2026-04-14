'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function EnrollPathButton({
  pathId,
  enrolled,
}: {
  pathId: number;
  enrolled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function enroll() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/learning-paths/enroll/{path_id}' as never, {
        params: { path: { path_id: pathId } },
      } as never);
      if (error) {
        toast.error('Failed to enroll in learning path');
        return;
      }
      toast.success('Enrolled in learning path — all courses added');
      router.refresh();
    });
  }

  if (enrolled) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        <Check className="size-3.5" />
        Enrolled
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={enroll} disabled={isPending} className="w-full">
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
      Enroll in path
    </Button>
  );
}

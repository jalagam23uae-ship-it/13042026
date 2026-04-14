'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PathRowActions({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm('Delete this learning path?')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/learning-paths/{path_id}', {
        params: { path: { path_id: id } },
      });
      if (error) {
        toast.error('Failed to delete.');
        return;
      }
      toast.success('Deleted');
      router.refresh();
    });
  }

  return (
    <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

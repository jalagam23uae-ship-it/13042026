'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function DeleteCourseButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!window.confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/enrollments/admin/courses/{course_id}', {
        params: { path: { course_id: id } },
      });
      if (error) {
        toast.error('Failed to delete course.');
        return;
      }
      toast.success('Course deleted');
      router.refresh();
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={confirmDelete}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      Delete
    </Button>
  );
}

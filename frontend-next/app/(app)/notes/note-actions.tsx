'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NoteRowActions({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm('Delete this note?')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/notes/{note_id}', {
        params: { path: { note_id: id } },
      });
      if (error) {
        toast.error('Failed to delete note.');
        return;
      }
      toast.success('Note deleted');
      router.refresh();
    });
  }

  return (
    <Button size="icon" variant="ghost" disabled={pending} onClick={remove}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

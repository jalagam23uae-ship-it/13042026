'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function NoteRowActions({ id }: { id: number }) {
  const { mutate: remove, isPending } = useApiMutation(
    () =>
      browserClient().DELETE('/notes/{note_id}', {
        params: { path: { note_id: id } },
      }),
    {
      successMessage: 'Note deleted',
      errorMessage: 'Failed to delete note.',
    },
  );

  function handleClick() {
    if (!confirm('Delete this note?')) return;
    remove(undefined);
  }

  return (
    <Button size="icon" variant="ghost" disabled={isPending} onClick={handleClick}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

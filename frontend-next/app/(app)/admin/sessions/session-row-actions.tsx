'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SessionForm, type SessionFormValues } from './session-form';

export function SessionRowActions({
  session,
  courses,
}: {
  session: SessionFormValues;
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function remove() {
    if (!confirm(`Delete session "${session.title}"?`)) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/sessions/{session_id}', {
        params: { path: { session_id: session.id! } },
      });
      if (error) {
        toast.error('Failed to delete session.');
        return;
      }
      toast.success('Session deleted');
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button size="icon" variant="ghost">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>Update session details.</DialogDescription>
          </DialogHeader>
          <SessionForm
            mode="edit"
            initial={session}
            courses={courses}
            onSaved={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </Button>
    </div>
  );
}

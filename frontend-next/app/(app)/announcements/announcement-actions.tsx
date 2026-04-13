'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function AnnouncementActions({
  id,
  title,
  message,
  pinned,
}: {
  id: number;
  title: string;
  message: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editMessage, setEditMessage] = useState(message);

  function saveEdit() {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/announcements/{announcement_id}' as never, {
        params: { path: { announcement_id: id } },
        body: { title: editTitle.trim(), message: editMessage } as never,
      } as never);
      if (error) {
        toast.error('Failed to update announcement');
        return;
      }
      toast.success('Announcement updated');
      setEditOpen(false);
      router.refresh();
    });
  }

  function togglePin() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/announcements/{announcement_id}' as never, {
        params: { path: { announcement_id: id } },
        body: { is_pinned: !pinned } as never,
      } as never);
      if (error) {
        toast.error('Failed to update announcement');
        return;
      }
      toast.success(pinned ? 'Unpinned' : 'Pinned to top');
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm('Delete this announcement?')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/announcements/{announcement_id}' as never, {
        params: { path: { announcement_id: id } },
      } as never);
      if (error) {
        toast.error('Failed to delete announcement');
        return;
      }
      toast.success('Announcement deleted');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditOpen(true)}
        disabled={isPending}
        aria-label="Edit announcement"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePin}
        disabled={isPending}
        aria-label={pinned ? 'Unpin' : 'Pin to top'}
        title={pinned ? 'Unpin' : 'Pin to top'}
      >
        {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={isPending}
        aria-label="Delete announcement"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-destructive" />}
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
            <DialogDescription>Update the title or message body.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ann-title-${id}`}>Title</Label>
              <Input
                id={`ann-title-${id}`}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ann-msg-${id}`}>Message (Markdown supported)</Label>
              <Textarea
                id={`ann-msg-${id}`}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

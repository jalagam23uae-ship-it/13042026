'use client';

import { useState } from 'react';
import { Loader2, Megaphone, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function CreateAnnouncementDialog({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);

  function reset() {
    setTitle('');
    setContent('');
    setCourseId('');
    setIsPinned(false);
  }

  const { mutate: post, isPending } = useApiMutation(
    () =>
      browserClient().POST('/announcements/', {
        body: {
          title: title.trim(),
          content: content.trim(),
          course_id: courseId ? Number(courseId) : null,
          is_pinned: isPinned,
        } as never,
      }),
    {
      successMessage: 'Announcement posted',
      errorMessage: 'Failed to post announcement.',
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    },
  );

  function submit() {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    post(undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Megaphone />
            Post announcement
          </Button>
        }
      />

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post new announcement</DialogTitle>
          <DialogDescription>Visible to all users or scoped to a specific course.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="an-title">Title *</Label>
            <Input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New course launched!" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="an-content">Content * <span className="text-muted-foreground font-normal">(Markdown supported)</span></Label>
            <Textarea id="an-content" value={content} onChange={(e) => setContent(e.target.value)}
              rows={5} placeholder={'Use **bold**, *italic*, `code`, - bullet lists…'} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="an-course">Target course</Label>
              <select
                id="an-course"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">— all users —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Options</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
                  className="size-4 rounded accent-primary" />
                <Pin className="size-3.5 text-muted-foreground" />
                <span className="text-sm">Pin to top</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Megaphone />}
            Post announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

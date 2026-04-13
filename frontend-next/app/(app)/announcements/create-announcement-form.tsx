'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreateAnnouncementForm({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/announcements/', {
        body: {
          title: title.trim(),
          content: content.trim(),
          course_id: courseId ? Number(courseId) : null,
          is_pinned: isPinned,
        } as never,
      });
      if (error) {
        toast.error('Failed to create announcement.');
        return;
      }
      toast.success('Announcement posted');
      setTitle('');
      setContent('');
      setCourseId('');
      setIsPinned(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="an-title">Title *</Label>
        <Input
          id="an-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. New course launched!"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="an-content">Content * (Markdown supported)</Label>
        <Textarea
          id="an-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          required
          placeholder="Use **bold**, *italic*, `code`, [links](https://example.com)…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="an-course">Course (optional — target audience)</Label>
          <select
            id="an-course"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">— all users —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="an-pin"
            type="checkbox"
            className="size-4"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
          />
          <Label htmlFor="an-pin" className="cursor-pointer">
            Pin to top
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Post announcement
      </Button>
    </form>
  );
}

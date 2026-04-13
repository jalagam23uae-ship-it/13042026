'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadInput } from '@/components/file-upload-input';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function EditCourseForm({
  courseId,
  initial,
}: {
  courseId: number;
  initial: { title: string; description: string; category: string; thumbnail_url: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnail_url);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/enrollments/admin/courses/{course_id}', {
        params: { path: { course_id: courseId } },
        body: {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          thumbnail_url: thumbnailUrl || null,
        } as never,
      });
      if (error) {
        toast.error('Failed to save course.');
        return;
      }
      toast.success('Course updated');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ec-title">Title *</Label>
          <Input
            id="ec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ec-cat">Category</Label>
          <Input
            id="ec-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Programming"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ec-desc">Description</Label>
        <Textarea
          id="ec-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Thumbnail image</Label>
        <FileUploadInput
          accept="image/*"
          onUploaded={(result) => setThumbnailUrl(result.url)}
          current={thumbnailUrl ? { url: thumbnailUrl } : null}
          label="Upload thumbnail"
        />
        {thumbnailUrl ? (
          <p className="font-mono text-[10px] text-muted-foreground truncate">
            {thumbnailUrl}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} size="sm" className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save course details
      </Button>
    </form>
  );
}

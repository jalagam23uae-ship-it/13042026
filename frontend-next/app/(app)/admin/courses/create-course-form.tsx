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
import { AiGenerateButton } from './ai-generate-button';

export function CreateCourseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/enrollments/admin/courses', {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
        } as never,
      });
      if (error) {
        toast.error('Failed to create course.');
        return;
      }
      toast.success(`Course "${title}" created`);
      setTitle('');
      setDescription('');
      setCategory('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="course-title">Title *</Label>
          <Input
            id="course-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced TypeScript"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="course-category">Category</Label>
          <Input
            id="course-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Programming"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will students learn?"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Create course
        </Button>
        <AiGenerateButton
          onApply={(meta) => {
            if (meta.title) setTitle(meta.title);
            if (meta.description) setDescription(meta.description);
          }}
        />
      </div>
    </form>
  );
}

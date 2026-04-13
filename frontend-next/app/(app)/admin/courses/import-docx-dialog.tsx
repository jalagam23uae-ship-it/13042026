'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Upload } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type PreviewSection = { heading?: string; content?: string };
type PreviewData = { title?: string; sections?: PreviewSection[] };

export function ImportDocxDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  function reset() {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.docx')) {
      toast.error('Only .docx files are supported');
      return;
    }
    setFile(f);
    setPreview(null);
  }

  function doPreview() {
    if (!file) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/course-import/preview', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error('Preview failed');
        const data = (await res.json()) as PreviewData;
        setPreview(data);
        if (data.title && !title) setTitle(data.title);
        toast.success('Preview loaded');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Preview failed');
      }
    });
  }

  function doImport() {
    if (!file) {
      toast.error('Choose a .docx file first');
      return;
    }
    if (!title.trim()) {
      toast.error('Course title is required');
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('course_title', title.trim());
        if (description.trim()) fd.append('course_description', description.trim());
        if (category.trim()) fd.append('category', category.trim());
        const res = await fetch('/api/course-import/import', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error('Import failed');
        const data = (await res.json()) as { course_id?: number; lessons_created?: number };
        toast.success(
          `Course created${data.lessons_created ? ` (${data.lessons_created} lessons)` : ''}`,
        );
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Import failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (reset(), setOpen(false)))}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="size-3.5" />
          Import DOCX
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import course from DOCX</DialogTitle>
          <DialogDescription>
            Upload a Word document to auto-generate a course with lessons. Preview first, then
            customize title/category before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="docx-file">DOCX file *</Label>
            <Input
              ref={fileRef}
              id="docx-file"
              type="file"
              accept=".docx"
              onChange={handleFile}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            ) : null}
          </div>

          {file ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={doPreview}
              disabled={isPending}
              className="self-start"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Preview parsed content
            </Button>
          ) : null}

          {preview ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="mb-2 font-semibold">Preview</div>
              {preview.title ? <div className="mb-1">Detected title: {preview.title}</div> : null}
              {preview.sections?.length ? (
                <ul className="list-inside list-disc text-muted-foreground">
                  {preview.sections.slice(0, 10).map((s, i) => (
                    <li key={i}>{s.heading ?? `Section ${i + 1}`}</li>
                  ))}
                  {preview.sections.length > 10 ? (
                    <li>… and {preview.sections.length - 10} more</li>
                  ) : null}
                </ul>
              ) : (
                <div className="text-muted-foreground">No sections detected.</div>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="docx-title">Course title *</Label>
              <Input
                id="docx-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="docx-category">Category</Label>
              <Input
                id="docx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Programming"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="docx-description">Description</Label>
            <Textarea
              id="docx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={doImport} disabled={isPending || !file}>
            {isPending ? <Loader2 className="animate-spin" /> : <Upload />}
            Import course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

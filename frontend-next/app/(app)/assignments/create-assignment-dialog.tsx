'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Loader2,
  Plus,
  Upload,
  X,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Presentation,
} from 'lucide-react';
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
import { uploadFile, formatBytes } from '@/lib/api/uploads';

/* ── file-type icon helper ─────────────────────────────────────────── */
function DocIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return <ImageIcon className="size-5 text-emerald-500 shrink-0" />;
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return <FileSpreadsheet className="size-5 text-emerald-600 shrink-0" />;
  if (['ppt', 'pptx'].includes(ext))
    return <Presentation className="size-5 text-orange-500 shrink-0" />;
  if (['doc', 'docx'].includes(ext))
    return <FileText className="size-5 text-blue-500 shrink-0" />;
  if (ext === 'pdf')
    return <File className="size-5 text-red-500 shrink-0" />;
  return <File className="size-5 text-muted-foreground shrink-0" />;
}

/* ── uploaded-file preview card ────────────────────────────────────── */
function DocPreviewCard({
  fileName,
  size,
  onRemove,
}: {
  fileName: string;
  size: number;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
      <DocIcon name={fileName} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 hover:bg-muted"
        aria-label="Remove file"
      >
        <X className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}

/* ── main dialog ────────────────────────────────────────────────────── */
export function CreateAssignmentDialog({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [courseId, setCourseId] = useState<string>(
    courses[0] ? String(courses[0].id) : '',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');

  /* document upload */
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState<{ url: string; name: string; size: number } | null>(null);

  function resetForm() {
    setTitle('');
    setDescription('');
    setDueDate('');
    setMaxScore('100');
    setDoc(null);
    if (courses[0]) setCourseId(String(courses[0].id));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, 'file');
      setDoc({ url: result.url, name: file.name, size: file.size });
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!title.trim() || !courseId) {
      toast.error('Title and course are required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/assignments/', {
        body: {
          course_id: Number(courseId),
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          max_score: Number(maxScore) || 100,
          file_url: doc?.url ?? null,
          file_name: doc?.name ?? null,
        } as never,
      });
      if (error) {
        toast.error('Failed to create assignment.');
        return;
      }
      toast.success(`Assignment "${title}" created`);
      resetForm();
      setOpen(false);
      router.refresh();
    });
  }

  if (courses.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            New assignment
          </Button>
        }
      />

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
          <DialogDescription>Fill in the details and optionally attach a document.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Course + Title */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-course">Course *</Label>
              <select
                id="ad-course"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-title">Title *</Label>
              <Input
                id="ad-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 1 Exercises"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ad-desc">Description / instructions</Label>
            <Textarea
              id="ad-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the task students need to complete…"
            />
          </div>

          {/* Due date + Max score */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-due">Due date</Label>
              <Input
                id="ad-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ad-max">Max score</Label>
              <Input
                id="ad-max"
                type="number"
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>

          {/* Document upload */}
          <div className="flex flex-col gap-1.5">
            <Label>Attachment (optional)</Label>
            {doc ? (
              <DocPreviewCard
                fileName={doc.name}
                size={doc.size}
                onRemove={() => setDoc(null)}
              />
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin shrink-0" />
                ) : (
                  <Upload className="size-4 shrink-0" />
                )}
                <span>{uploading ? 'Uploading…' : 'Click to upload a document'}</span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.png,.jpg,.jpeg,.webp"
                  onChange={handleFile}
                />
              </label>
            )}
            <p className="text-[11px] text-muted-foreground">
              PDF, Word, PowerPoint, Excel, images — up to 500 MB
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || uploading}>
            {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Create assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

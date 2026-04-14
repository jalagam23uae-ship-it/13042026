'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
  GraduationCap,
  Clock,
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
import { uploadFile } from '@/lib/api/uploads';
import { AiGenerateButton } from './ai-generate-button';

type Tab = 'manual' | 'docx';
type PreviewSection = { heading?: string; content?: string };

/* ── helpers ──────────────────────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* ── main component ───────────────────────────────────────────────── */
export function CreateCourseDialog({ isInstructor = false }: { isInstructor?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('manual');
  const [isPending, startTransition] = useTransition();

  /* --- manual tab state --- */
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailName, setThumbnailName] = useState('');
  const [tags, setTags] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [requirements, setRequirements] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [certificate, setCertificate] = useState(true);
  const [thumbUploading, setThumbUploading] = useState(false);

  /* --- docx tab state --- */
  const docxRef = useRef<HTMLInputElement>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [docxTitle, setDocxTitle] = useState('');
  const [docxCategory, setDocxCategory] = useState('');
  const [docxDescription, setDocxDescription] = useState('');
  const [docxPreview, setDocxPreview] = useState<{
    title?: string;
    sections?: PreviewSection[];
  } | null>(null);

  function resetAll() {
    setTab('manual');
    setTitle(''); setCategory(''); setDescription('');
    setThumbnailUrl(''); setThumbnailName('');
    setTags(''); setLearningOutcomes(''); setRequirements('');
    setStartDate(''); setEndDate(''); setCertificate(true);
    setDocxFile(null); setDocxTitle(''); setDocxCategory('');
    setDocxDescription(''); setDocxPreview(null);
    if (docxRef.current) docxRef.current.value = '';
  }

  /* --- thumbnail upload --- */
  async function handleThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setThumbUploading(true);
    try {
      const result = await uploadFile(file, 'file');
      setThumbnailUrl(result.url);
      setThumbnailName(file.name);
      toast.success('Thumbnail uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setThumbUploading(false);
    }
  }

  /* --- manual create --- */
  function submitManual() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/enrollments/admin/courses', {
        body: {
          title: title.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl || null,
          tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          learning_outcomes: learningOutcomes.trim()
            ? learningOutcomes.split('\n').map((l) => l.trim()).filter(Boolean)
            : undefined,
          requirements: requirements.trim()
            ? requirements.split('\n').map((r) => r.trim()).filter(Boolean)
            : undefined,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
          certificate_enabled: certificate,
        } as never,
      });
      if (error) { toast.error('Failed to create course.'); return; }
      if (isInstructor) {
        toast.success(`Course "${title}" submitted for admin approval`);
      } else {
        toast.success(`Course "${title}" created`);
      }
      resetAll();
      setOpen(false);
      router.refresh();
    });
  }

  /* --- docx preview --- */
  function doDocxPreview() {
    if (!docxFile) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', docxFile);
        const res = await fetch('/api/course-import/preview', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Preview failed');
        const raw = await res.json();
        const parsed = raw?.parsed ?? raw;
        const sections: PreviewSection[] = (parsed?.flat_lessons ?? parsed?.sections ?? []).map(
          (l: Record<string, unknown>) => ({ heading: String(l.title ?? l.heading ?? '') }),
        );
        setDocxPreview({ title: parsed?.title, sections });
        if (parsed?.title && !docxTitle) setDocxTitle(parsed.title);
        toast.success('Preview loaded');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Preview failed');
      }
    });
  }

  /* --- docx import --- */
  function doDocxImport() {
    if (!docxFile) { toast.error('Choose a .docx file first'); return; }
    if (!docxTitle.trim()) { toast.error('Course title is required'); return; }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', docxFile);
        fd.append('course_title', docxTitle.trim());
        if (docxDescription.trim()) fd.append('course_description', docxDescription.trim());
        if (docxCategory.trim()) fd.append('category', docxCategory.trim());
        const res = await fetch('/api/course-import/import', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Import failed');
        const data = await res.json() as { course_id?: number; lessons_created?: number };
        toast.success(`Course created${data.lessons_created ? ` (${data.lessons_created} lessons)` : ''}`);
        resetAll();
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Import failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            New course
          </Button>
        }
      />

      {/* max-h + flex column keeps header/footer pinned, content scrolls */}
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-3xl max-h-[90vh]">
        {/* ── fixed header ── */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            {isInstructor
              ? 'Create a course and submit it for admin approval. It will be visible to students once approved.'
              : 'Create a course manually or import the structure from a Word document.'}
          </DialogDescription>
          {isInstructor && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 mt-1 text-xs text-amber-800">
              <Clock className="size-3.5 shrink-0 mt-0.5" />
              <span>Your course will be submitted for admin approval. Once approved it becomes active and visible to students.</span>
            </div>
          )}
          {/* tab bar */}
          <div className="flex gap-1 rounded-lg bg-muted p-1 mt-3 w-fit">
            <TabButton active={tab === 'manual'} onClick={() => setTab('manual')}>
              <Plus className="size-3.5" />
              Create manually
            </TabButton>
            <TabButton active={tab === 'docx'} onClick={() => setTab('docx')}>
              <FileText className="size-3.5" />
              Import from DOCX
            </TabButton>
          </div>
        </DialogHeader>

        {/* ── scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {tab === 'manual' ? (
            <div className="flex flex-col gap-4">
              {/* Title + Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-title">Title *</Label>
                  <Input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Advanced TypeScript" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-cat">Category</Label>
                  <Input id="cc-cat" value={category} onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Programming" />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cc-desc">Description</Label>
                <Textarea id="cc-desc" value={description}
                  onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="What will students learn in this course?" />
              </div>

              {/* AI generate */}
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Auto-fill with AI</span>
                <AiGenerateButton
                  onApply={(meta) => {
                    if (meta.title) setTitle(meta.title);
                    if (meta.description) setDescription(meta.description);
                    if (meta.learning_outcomes?.length)
                      setLearningOutcomes(meta.learning_outcomes.join('\n'));
                    if (meta.requirements?.length)
                      setRequirements(meta.requirements.join('\n'));
                  }}
                />
              </div>

              {/* Thumbnail */}
              <div className="flex flex-col gap-1.5">
                <Label>Thumbnail image</Label>
                {thumbnailUrl ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <BookOpen className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-sm">{thumbnailName}</span>
                    <button type="button" onClick={() => { setThumbnailUrl(''); setThumbnailName(''); }}
                      className="rounded p-0.5 hover:bg-muted">
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                    {thumbUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Upload thumbnail
                    <input type="file" className="hidden" accept="image/*"
                      disabled={thumbUploading} onChange={handleThumbnail} />
                  </label>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cc-tags" className="flex items-center gap-1.5">
                  Tags
                </Label>
                <Input id="cc-tags" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="python, backend, api  (comma-separated)" />
              </div>

              {/* Learning outcomes + Requirements */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-outcomes">Learning outcomes</Label>
                  <Textarea id="cc-outcomes" value={learningOutcomes}
                    onChange={(e) => setLearningOutcomes(e.target.value)} rows={4}
                    placeholder={'One per line\ne.g. Build REST APIs\ne.g. Deploy with Docker'} />
                  <p className="text-[11px] text-muted-foreground">One item per line</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-req">Requirements</Label>
                  <Textarea id="cc-req" value={requirements}
                    onChange={(e) => setRequirements(e.target.value)} rows={4}
                    placeholder={'One per line\ne.g. Basic Python\nknowledge'} />
                  <p className="text-[11px] text-muted-foreground">One item per line</p>
                </div>
              </div>

              {/* Start + End date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-start">Start date</Label>
                  <Input id="cc-start" type="datetime-local" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-end">End date</Label>
                  <Input id="cc-end" type="datetime-local" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Certificate */}
              <label className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <input type="checkbox" checked={certificate}
                  onChange={(e) => setCertificate(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-primary" />
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <GraduationCap className="size-4 text-primary" />
                    Issue completion certificate
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students who complete all lessons can generate a certificate.
                  </p>
                </div>
              </label>
            </div>
          ) : (
            /* ── DOCX import tab ── */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cc-docx">DOCX file *</Label>
                <Input ref={docxRef} id="cc-docx" type="file" accept=".docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) return;
                    if (!f.name.toLowerCase().endsWith('.docx')) {
                      toast.error('Only .docx files are supported'); return;
                    }
                    setDocxFile(f); setDocxPreview(null);
                  }} />
                {docxFile ? (
                  <p className="text-xs text-muted-foreground">
                    {docxFile.name} · {(docxFile.size / 1024).toFixed(1)} KB
                  </p>
                ) : null}
              </div>

              {docxFile ? (
                <Button type="button" variant="outline" size="sm" onClick={doDocxPreview}
                  disabled={isPending} className="self-start">
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Preview parsed content
                </Button>
              ) : null}

              {docxPreview ? (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="mb-2 font-semibold">Preview</div>
                  {docxPreview.title ? (
                    <div className="mb-1">Detected title: {docxPreview.title}</div>
                  ) : null}
                  {docxPreview.sections?.length ? (
                    <ul className="list-inside list-disc text-muted-foreground space-y-0.5">
                      {docxPreview.sections.slice(0, 12).map((s, i) => (
                        <li key={i}>{s.heading ?? `Section ${i + 1}`}</li>
                      ))}
                      {docxPreview.sections.length > 12 ? (
                        <li>… and {docxPreview.sections.length - 12} more</li>
                      ) : null}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground">No sections detected.</div>
                  )}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-dtitle">Course title *</Label>
                  <Input id="cc-dtitle" value={docxTitle}
                    onChange={(e) => setDocxTitle(e.target.value)} placeholder="Course title" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-dcat">Category</Label>
                  <Input id="cc-dcat" value={docxCategory}
                    onChange={(e) => setDocxCategory(e.target.value)} placeholder="e.g. Programming" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cc-ddesc">Description</Label>
                <Textarea id="cc-ddesc" value={docxDescription}
                  onChange={(e) => setDocxDescription(e.target.value)} rows={3} />
              </div>
            </div>
          )}
        </div>

        {/* ── fixed footer ── */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          {tab === 'manual' ? (
            <Button onClick={submitManual} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : isInstructor ? <Clock /> : <Plus />}
              {isInstructor ? 'Submit for approval' : 'Create course'}
            </Button>
          ) : (
            <Button onClick={doDocxImport} disabled={isPending || !docxFile}>
              {isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Import course
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

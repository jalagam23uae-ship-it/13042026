'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Film,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileUploadInput } from '@/components/file-upload-input';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export type Lesson = {
  id: number;
  course_id: number;
  section_id?: number | null;
  title: string;
  description?: string | null;
  video_url?: string | null;
  content_type?: string | null;
  duration_min?: number | null;
  sort_order?: number | null;
  is_free?: boolean | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
};

export type Section = {
  id: number;
  title: string;
  sort_order: number;
};

type LessonDraft = {
  title: string;
  description: string;
  content_type: string;
  duration_min: string;
  video_url: string;
  attachment_url: string;
  attachment_name: string;
  section_id: number | null;
};

const EMPTY_DRAFT: LessonDraft = {
  title: '',
  description: '',
  content_type: 'video',
  duration_min: '',
  video_url: '',
  attachment_url: '',
  attachment_name: '',
  section_id: null,
};

export function CourseContentManager({
  courseId,
  initialSections,
  initialLessons,
}: {
  courseId: number;
  initialSections: Section[];
  initialLessons: Lesson[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  const [activeForm, setActiveForm] = useState<{
    sectionId: number | null;
    editingId: number | null;
    draft: LessonDraft;
  } | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [, startTransition] = useTransition();

  const groupedLessons = useMemo(() => {
    const map = new Map<number | 'uncategorized', Lesson[]>();
    for (const l of lessons) {
      const key = l.section_id ?? 'uncategorized';
      const list = map.get(key);
      if (list) list.push(l);
      else map.set(key, [l]);
    }
    return map;
  }, [lessons]);

  async function addSection() {
    if (!newSectionTitle.trim()) {
      toast.error('Section title required');
      return;
    }
    setSavingSection(true);
    try {
      const client = browserClient();
      const { data, error } = await client.POST('/lessons/sections', {
        body: {
          course_id: courseId,
          title: newSectionTitle.trim(),
          sort_order: sections.length,
        } as never,
      });
      if (error || !data) {
        toast.error('Failed to create section.');
        return;
      }
      const created = data as Section;
      setSections((prev) => [...prev, created]);
      setNewSectionTitle('');
      toast.success('Section added');
      router.refresh();
    } finally {
      setSavingSection(false);
    }
  }

  async function deleteSection(sectionId: number) {
    if (
      !window.confirm(
        'Delete this section? Lessons inside will become uncategorized.',
      )
    )
      return;
    const client = browserClient();
    const { error } = await client.DELETE('/lessons/sections/{section_id}', {
      params: { path: { section_id: sectionId } },
    });
    if (error) {
      toast.error('Failed to delete section.');
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setLessons((prev) =>
      prev.map((l) => (l.section_id === sectionId ? { ...l, section_id: null } : l)),
    );
    toast.success('Section deleted');
    startTransition(() => router.refresh());
  }

  function openNewLessonForm(sectionId: number | null) {
    setActiveForm({
      sectionId,
      editingId: null,
      draft: { ...EMPTY_DRAFT, section_id: sectionId },
    });
  }

  function openEditLessonForm(lesson: Lesson) {
    setActiveForm({
      sectionId: lesson.section_id ?? null,
      editingId: lesson.id,
      draft: {
        title: lesson.title,
        description: lesson.description ?? '',
        content_type: lesson.content_type ?? 'video',
        duration_min: lesson.duration_min ? String(lesson.duration_min) : '',
        video_url: lesson.video_url ?? '',
        attachment_url: lesson.attachment_url ?? '',
        attachment_name: lesson.attachment_name ?? '',
        section_id: lesson.section_id ?? null,
      },
    });
  }

  function updateDraft(patch: Partial<LessonDraft>) {
    setActiveForm((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  }

  async function saveLesson() {
    if (!activeForm) return;
    const { draft, editingId, sectionId } = activeForm;
    if (!draft.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }
    setSavingLesson(true);
    try {
      const client = browserClient();
      const body = {
        course_id: courseId,
        section_id: sectionId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        content_type: draft.content_type || 'video',
        duration_min: draft.duration_min ? Number(draft.duration_min) : null,
        video_url: draft.video_url || null,
        attachment_url: draft.attachment_url || null,
        attachment_name: draft.attachment_name || null,
      };

      if (editingId != null) {
        const { error } = await client.PUT('/lessons/{lesson_id}', {
          params: { path: { lesson_id: editingId } },
          body: body as never,
        });
        if (error) {
          toast.error('Failed to update lesson.');
          return;
        }
        setLessons((prev) =>
          prev.map((l) =>
            l.id === editingId
              ? ({
                  ...l,
                  ...body,
                } as Lesson)
              : l,
          ),
        );
        toast.success('Lesson updated');
      } else {
        const { data, error } = await client.POST('/lessons/', {
          body: body as never,
        });
        if (error || !data) {
          toast.error('Failed to create lesson.');
          return;
        }
        setLessons((prev) => [...prev, data as Lesson]);
        toast.success('Lesson created');
      }
      setActiveForm(null);
      startTransition(() => router.refresh());
    } finally {
      setSavingLesson(false);
    }
  }

  async function deleteLesson(lessonId: number) {
    if (!window.confirm('Delete this lesson?')) return;
    const client = browserClient();
    const { error } = await client.DELETE('/lessons/{lesson_id}', {
      params: { path: { lesson_id: lessonId } },
    });
    if (error) {
      toast.error('Failed to delete lesson.');
      return;
    }
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    toast.success('Lesson deleted');
    startTransition(() => router.refresh());
  }

  function renderLessonRow(lesson: Lesson) {
    return (
      <div key={lesson.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
        {lesson.video_url ? (
          <Film className="size-4 shrink-0 text-primary" />
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{lesson.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {lesson.content_type ?? 'lesson'}
            {lesson.duration_min ? ` · ${lesson.duration_min} min` : ''}
            {lesson.attachment_name ? ` · 📎 ${lesson.attachment_name}` : ''}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => openEditLessonForm(lesson)}
          aria-label="Edit lesson"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:text-destructive"
          onClick={() => deleteLesson(lesson.id)}
          aria-label="Delete lesson"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    );
  }

  function renderLessonForm(sectionId: number | null) {
    if (!activeForm || activeForm.sectionId !== sectionId) return null;
    const { draft, editingId } = activeForm;
    return (
      <div className="rounded-md border border-dashed p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold">
            {editingId != null ? 'Edit lesson' : 'New lesson'}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() => setActiveForm(null)}
            aria-label="Cancel"
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-title">Title *</Label>
              <Input
                id="lf-title"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-type">Content type</Label>
              <select
                id="lf-type"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={draft.content_type}
                onChange={(e) => updateDraft({ content_type: e.target.value })}
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="pdf">PDF</option>
                <option value="quiz">Quiz</option>
                <option value="exercise">Exercise</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lf-desc">Description</Label>
            <Textarea
              id="lf-desc"
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-dur">Duration (min)</Label>
              <Input
                id="lf-dur"
                type="number"
                min={0}
                value={draft.duration_min}
                onChange={(e) => updateDraft({ duration_min: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lf-video-url">Video URL (or upload below)</Label>
              <Input
                id="lf-video-url"
                value={draft.video_url}
                onChange={(e) => updateDraft({ video_url: e.target.value })}
                placeholder="https://youtube.com/... or /uploads/..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Upload video (mp4, webm)</Label>
            <FileUploadInput
              kind="video"
              accept="video/*"
              onUploaded={(result) => updateDraft({ video_url: result.url })}
              label="Upload video"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Attachment (PDF, slides, etc.)</Label>
            <FileUploadInput
              onUploaded={(result, file) =>
                updateDraft({
                  attachment_url: result.url,
                  attachment_name: file.name,
                })
              }
              current={
                draft.attachment_url
                  ? { url: draft.attachment_url, filename: draft.attachment_name }
                  : null
              }
              label="Upload attachment"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={saveLesson} disabled={savingLesson}>
              {savingLesson ? <Loader2 className="animate-spin" /> : null}
              {editingId != null ? 'Save changes' : 'Create lesson'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveForm(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* New section */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="new-section">New section</Label>
          <Input
            id="new-section"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="e.g. Getting Started"
          />
        </div>
        <Button onClick={addSection} disabled={savingSection}>
          {savingSection ? <Loader2 className="animate-spin" /> : <Plus />}
          Add section
        </Button>
      </div>

      {sections.length === 0 && (groupedLessons.get('uncategorized') ?? []).length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No sections or lessons yet. Add a section above, then add lessons.
        </p>
      ) : null}

      {/* Sections */}
      {sections.map((section) => {
        const sectionLessons = groupedLessons.get(section.id) ?? [];
        return (
          <div key={section.id} className="rounded-md border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{section.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {sectionLessons.length} lessons
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openNewLessonForm(section.id)}
                >
                  <Plus />
                  Lesson
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => deleteSection(section.id)}
                  aria-label="Delete section"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {sectionLessons.map(renderLessonRow)}
              {renderLessonForm(section.id)}
            </div>
          </div>
        );
      })}

      {/* Uncategorized lessons */}
      {(groupedLessons.get('uncategorized') ?? []).length > 0 || sections.length === 0 ? (
        <div className="rounded-md border border-dashed p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Uncategorized lessons</span>
            <Button size="sm" variant="outline" onClick={() => openNewLessonForm(null)}>
              <Plus />
              Lesson
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {(groupedLessons.get('uncategorized') ?? []).map(renderLessonRow)}
            {renderLessonForm(null)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

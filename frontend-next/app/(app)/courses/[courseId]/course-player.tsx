'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Loader2,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { NotesPanel } from './notes-panel';
import { DiscussionsPanel } from './discussions-panel';

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
  completed?: boolean | null;
  progress_pct?: number | null;
  last_position?: number | null;
};

export type Section = {
  id: number;
  title: string;
  sort_order: number;
};

type Props = {
  courseId: number;
  courseTitle: string;
  sections: Section[];
  lessons: Lesson[];
};

function isYouTube(url?: string | null): boolean {
  if (!url) return false;
  return /youtube\.com|youtu\.be/.test(url);
}

function youtubeEmbed(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function CoursePlayer({ courseId, courseTitle, sections, lessons: initialLessons }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [currentId, setCurrentId] = useState<number | null>(
    initialLessons.find((l) => !l.completed)?.id ?? initialLessons[0]?.id ?? null,
  );
  const [savingProgress, setSavingProgress] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedPctRef = useRef<number>(0);

  const current = useMemo(
    () => lessons.find((l) => l.id === currentId) ?? null,
    [lessons, currentId],
  );
  const currentIndex = useMemo(
    () => (current ? lessons.findIndex((l) => l.id === current.id) : -1),
    [lessons, current],
  );

  const groupedLessons = useMemo(() => {
    const groups = new Map<number | 'uncategorized', Lesson[]>();
    for (const lesson of lessons) {
      const key = lesson.section_id ?? 'uncategorized';
      const existing = groups.get(key);
      if (existing) {
        existing.push(lesson);
      } else {
        groups.set(key, [lesson]);
      }
    }
    return groups;
  }, [lessons]);

  const saveProgress = useCallback(
    async (lessonId: number, progressPct: number, lastPosition: number) => {
      if (Math.abs(progressPct - lastSavedPctRef.current) < 5 && progressPct < 90) return;
      lastSavedPctRef.current = progressPct;
      const client = browserClient();
      await client.POST('/lessons/progress', {
        body: {
          lesson_id: lessonId,
          progress_pct: progressPct,
          last_position: lastPosition,
        } as never,
      });
    },
    [],
  );

  const markComplete = useCallback(
    async (lessonId: number) => {
      setSavingProgress(true);
      try {
        const client = browserClient();
        const { error } = await client.POST('/lessons/complete/{lesson_id}', {
          params: { path: { lesson_id: lessonId } },
        });
        if (error) {
          toast.error('Failed to mark complete.');
          return;
        }
        setLessons((prev) =>
          prev.map((l) => (l.id === lessonId ? { ...l, completed: true, progress_pct: 100 } : l)),
        );
        toast.success('Lesson completed');
      } finally {
        setSavingProgress(false);
      }
    },
    [],
  );

  // Video event handlers — track progress + auto-complete at 90%
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    const handleTimeUpdate = () => {
      if (!video.duration) return;
      const pct = Math.round((video.currentTime / video.duration) * 100);
      if (pct >= 90 && !current.completed) {
        markComplete(current.id);
      } else if (pct >= 5) {
        saveProgress(current.id, pct, Math.floor(video.currentTime));
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [current, markComplete, saveProgress]);

  // Heartbeat for course-view tracking
  useEffect(() => {
    const client = browserClient();
    client
      .POST('/time-tracking/course-view/start', { body: { course_id: courseId } as never })
      .catch(() => {});
    const interval = setInterval(() => {
      client.POST('/time-tracking/heartbeat', { body: { course_id: courseId } as never }).catch(() => {});
    }, 30_000);
    return () => {
      clearInterval(interval);
      client
        .POST('/time-tracking/course-view/end', { body: { course_id: courseId } as never })
        .catch(() => {});
    };
  }, [courseId]);

  function selectLesson(lessonId: number) {
    // Save current lesson progress before switching
    const video = videoRef.current;
    if (video && current && video.duration) {
      const pct = Math.round((video.currentTime / video.duration) * 100);
      saveProgress(current.id, pct, Math.floor(video.currentTime));
    }
    setCurrentId(lessonId);
    lastSavedPctRef.current = 0;
  }

  function goPrev() {
    if (currentIndex > 0) selectLesson(lessons[currentIndex - 1]!.id);
  }
  function goNext() {
    if (currentIndex >= 0 && currentIndex < lessons.length - 1)
      selectLesson(lessons[currentIndex + 1]!.id);
  }

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          This course has no lessons yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Main content */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-0">
            {current ? renderLessonMedia(current, videoRef) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex <= 0}>
            <ChevronLeft />
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {current?.attachment_url ? (
              <a
                href={`/api${current.attachment_url.startsWith('/') ? '' : '/'}${current.attachment_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                <Download />
                {current.attachment_name ?? 'Attachment'}
              </a>
            ) : null}
            {current && !current.completed ? (
              <Button size="sm" onClick={() => markComplete(current.id)} disabled={savingProgress}>
                {savingProgress ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                Mark complete
              </Button>
            ) : current?.completed ? (
              <Badge variant="secondary">
                <CheckCircle2 />
                Completed
              </Badge>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={currentIndex < 0 || currentIndex >= lessons.length - 1}
          >
            Next
            <ChevronRight />
          </Button>
        </div>

        {current ? (
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="notes">My Notes</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <Card>
                <CardContent className="text-sm pt-4">
                  <h2 className="text-base font-semibold mb-2">{current.title}</h2>
                  {current.description ? (
                    <p className="text-muted-foreground whitespace-pre-wrap">{current.description}</p>
                  ) : (
                    <p className="text-muted-foreground">No description.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel lessonId={current.id} />
            </TabsContent>
            <TabsContent value="discussion">
              <DiscussionsPanel lessonId={current.id} />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      {/* Sidebar: sections + lessons */}
      <Card className="h-fit max-h-[calc(100vh-8rem)] overflow-y-auto flex flex-col">
        {/* Sticky header with progress */}
        <div className="sticky top-0 z-10 border-b bg-card px-4 py-3 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Course Content
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{courseTitle}</p>
          {(() => {
            const completedCount = lessons.filter((l) => l.completed).length;
            const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
            return (
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{completedCount} / {lessons.length} lessons</span>
                  <span className="font-medium">{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        <CardContent className="p-2 pt-3 text-sm">
          {sections.length > 0 ? (
            sections.map((section) => (
              <div key={section.id} className="mb-4">
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {section.title}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {(groupedLessons.get(section.id) ?? []).map((l) => (
                  <LessonRow
                    key={l.id}
                    lesson={l}
                    active={l.id === currentId}
                    onClick={() => selectLesson(l.id)}
                  />
                ))}
              </div>
            ))
          ) : null}
          {(groupedLessons.get('uncategorized') ?? []).length > 0 ? (
            <div className="mb-3">
              {sections.length > 0 ? (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Other
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : null}
              {(groupedLessons.get('uncategorized') ?? []).map((l) => (
                <LessonRow
                  key={l.id}
                  lesson={l}
                  active={l.id === currentId}
                  onClick={() => selectLesson(l.id)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function LessonRow({
  lesson,
  active,
  onClick,
}: {
  lesson: Lesson;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all',
        active
          ? 'bg-primary/10 font-medium text-primary'
          : lesson.completed
            ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
            : 'hover:bg-accent',
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
      )}

      {/* Status icon */}
      {lesson.completed ? (
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-3 text-emerald-600" />
        </div>
      ) : active ? (
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <PlayCircle className="size-3 text-primary" />
        </div>
      ) : (
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border group-hover:border-primary/40">
          <Circle className="size-2.5 text-muted-foreground" />
        </div>
      )}

      <span className="flex-1 truncate leading-snug">{lesson.title}</span>

      {lesson.duration_min ? (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {lesson.duration_min}m
        </span>
      ) : null}
    </button>
  );
}

function renderLessonMedia(lesson: Lesson, videoRef: React.RefObject<HTMLVideoElement | null>) {
  const url = lesson.video_url;

  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <FileText className="size-10" />
          <span>No media for this lesson</span>
        </div>
      </div>
    );
  }

  if (isYouTube(url)) {
    return (
      <iframe
        src={youtubeEmbed(url)}
        title={lesson.title}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Direct video URL — route through BFF if relative
  const src = url.startsWith('http') || url.startsWith('/api/')
    ? url
    : `/api${url.startsWith('/') ? '' : '/'}${url}`;

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className="aspect-video w-full bg-black"
      poster={undefined}
    >
      <PlayCircle />
      Your browser does not support the video tag.
    </video>
  );
}

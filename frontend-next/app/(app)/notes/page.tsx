import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, StickyNote } from 'lucide-react';
import { NoteRowActions } from './note-actions';

type Note = {
  id: number;
  user_id: number;
  lesson_id: number;
  content: string;
  video_timestamp?: number | null;
  is_bookmark?: boolean | null;
  created_at?: string | null;
};

export default async function NotesPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/notes/my', {});
  const notes = (Array.isArray(data) ? data : []) as Note[];

  // Group by lesson
  const byLesson = new Map<number, Note[]>();
  for (const n of notes) {
    const arr = byLesson.get(n.lesson_id) ?? [];
    arr.push(n);
    byLesson.set(n.lesson_id, arr);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <StickyNote className="size-5 text-muted-foreground" />
          My notes
        </h1>
        <p className="text-sm text-muted-foreground">
          Notes and bookmarks saved while watching lessons. Open a lesson to add new
          notes.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load notes.
          </CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You haven&apos;t saved any notes yet.{' '}
            <Link href="/courses" className="underline underline-offset-2">
              Browse your courses
            </Link>{' '}
            to start.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(byLesson.entries()).map(([lessonId, lessonNotes]) => (
            <Card key={lessonId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Lesson #{lessonId}</CardTitle>
                  <Link
                    href={`/courses`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Open lesson
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {lessonNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {note.is_bookmark ? (
                          <Badge variant="secondary" className="gap-1">
                            <Bookmark className="size-2.5" />
                            Bookmark
                          </Badge>
                        ) : null}
                        {note.video_timestamp ? (
                          <span className="text-xs text-muted-foreground">
                            @ {formatTimestamp(note.video_timestamp)}
                          </span>
                        ) : null}
                        {note.created_at ? (
                          <time className="text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleDateString()}
                          </time>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{note.content}</p>
                    </div>
                    <NoteRowActions id={note.id} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

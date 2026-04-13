'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type Note = {
  id: number;
  lesson_id: number;
  content: string;
  is_bookmark?: boolean | null;
  video_timestamp?: number | null;
  created_at?: string | null;
};

export function NotesPanel({ lessonId }: { lessonId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = browserClient();
      const { data } = await client.GET('/notes/lesson/{lesson_id}', {
        params: { path: { lesson_id: lessonId } },
      });
      setNotes((Array.isArray(data) ? data : []) as Note[]);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addNote() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const client = browserClient();
      const { error } = await client.POST('/notes/', {
        body: { lesson_id: lessonId, content: draft.trim(), is_bookmark: false } as never,
      });
      if (error) {
        toast.error('Failed to save note.');
        return;
      }
      setDraft('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleBookmark(note: Note) {
    const client = browserClient();
    const { error } = await client.PUT('/notes/{note_id}', {
      params: { path: { note_id: note.id } },
      body: { content: note.content, is_bookmark: !note.is_bookmark } as never,
    });
    if (error) {
      toast.error('Failed to update note.');
      return;
    }
    await load();
  }

  async function deleteNote(noteId: number) {
    const client = browserClient();
    const { error } = await client.DELETE('/notes/{note_id}', {
      params: { path: { note_id: noteId } },
    });
    if (error) {
      toast.error('Failed to delete note.');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a note about this lesson…"
            rows={2}
          />
          <Button size="sm" onClick={addNote} disabled={saving || !draft.trim()}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet for this lesson.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <button
                  type="button"
                  className="mt-0.5"
                  onClick={() => toggleBookmark(note)}
                  aria-label={note.is_bookmark ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {note.is_bookmark ? (
                    <BookmarkCheck className="size-4 text-primary" />
                  ) : (
                    <Bookmark className="size-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 whitespace-pre-wrap">{note.content}</div>
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

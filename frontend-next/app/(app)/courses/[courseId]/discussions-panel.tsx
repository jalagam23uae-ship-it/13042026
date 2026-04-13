'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type Post = {
  id: number;
  lesson_id: number;
  user_id: number;
  user_name?: string | null;
  content: string;
  parent_id?: number | null;
  is_answer?: boolean | null;
  created_at?: string | null;
};

export function DiscussionsPanel({ lessonId }: { lessonId: number }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = browserClient();
      const { data } = await client.GET('/discussions/lesson/{lesson_id}', {
        params: { path: { lesson_id: lessonId } },
      });
      setPosts((Array.isArray(data) ? data : []) as Post[]);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPost(parent_id: number | null = null, content?: string) {
    const text = (content ?? draft).trim();
    if (!text) return;
    setSaving(true);
    try {
      const client = browserClient();
      const { error } = await client.POST('/discussions/', {
        body: { lesson_id: lessonId, content: text, parent_id } as never,
      });
      if (error) {
        toast.error('Failed to post.');
        return;
      }
      if (parent_id === null) setDraft('');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(postId: number) {
    const client = browserClient();
    const { error } = await client.DELETE('/discussions/{post_id}', {
      params: { path: { post_id: postId } },
    });
    if (error) {
      toast.error('Failed to delete.');
      return;
    }
    await load();
  }

  async function markAnswer(postId: number) {
    const client = browserClient();
    const { error } = await client.PUT('/discussions/{post_id}/mark-answer', {
      params: { path: { post_id: postId } },
    });
    if (error) {
      toast.error('Failed to mark answer.');
      return;
    }
    await load();
  }

  const topLevel = posts.filter((p) => !p.parent_id);
  const replyMap = new Map<number, Post[]>();
  posts
    .filter((p) => p.parent_id != null)
    .forEach((p) => {
      const parentId = p.parent_id!;
      const list = replyMap.get(parentId) ?? [];
      list.push(p);
      replyMap.set(parentId, list);
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question or start a discussion…"
            rows={2}
          />
          <Button size="sm" onClick={() => addPost()} disabled={saving || !draft.trim()}>
            {saving ? <Loader2 className="animate-spin" /> : <Send />}
            Post
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading discussions…</p>
        ) : topLevel.length === 0 ? (
          <p className="text-xs text-muted-foreground">No discussions yet. Be the first.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topLevel.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                replies={replyMap.get(post.id) ?? []}
                onDelete={deletePost}
                onReply={(content) => addPost(post.id, content)}
                onMarkAnswer={markAnswer}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PostRow({
  post,
  replies,
  onDelete,
  onReply,
  onMarkAnswer,
}: {
  post: Post;
  replies: Post[];
  onDelete: (id: number) => void;
  onReply: (content: string) => void;
  onMarkAnswer: (id: number) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{post.user_name ?? `User #${post.user_id}`}</div>
          {post.created_at ? (
            <div className="text-[10px] text-muted-foreground">
              {new Date(post.created_at).toLocaleString()}
            </div>
          ) : null}
        </div>
        <div className="flex gap-1">
          {post.is_answer ? (
            <span className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle2 className="size-3.5" />
              Answer
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap">{post.content}</p>

      <div className="mt-2 flex gap-1 text-xs">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setReplying(!replying)}
        >
          Reply
        </button>
        {!post.is_answer ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onMarkAnswer(post.id)}
          >
            · Mark as answer
          </button>
        ) : null}
      </div>

      {replying ? (
        <div className="mt-2 flex items-start gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!draft.trim()) return;
              onReply(draft);
              setDraft('');
              setReplying(false);
            }}
          >
            Reply
          </Button>
        </div>
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-md bg-muted/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-medium">
                    {reply.user_name ?? `User #${reply.user_id}`}
                  </div>
                  {reply.created_at ? (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(reply.created_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(reply.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete reply"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <p className="mt-1 text-xs whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

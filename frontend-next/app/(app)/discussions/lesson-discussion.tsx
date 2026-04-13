'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, CheckCircle2, Trash2, CornerDownRight } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type DiscussionPost = {
  id: number;
  lesson_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_answer?: boolean | null;
  created_at?: string | null;
  author_name?: string;
  replies?: DiscussionPost[];
};

export function LessonDiscussion({
  lessonId,
  initialPosts,
  currentUserId,
  currentRole,
}: {
  lessonId: number;
  initialPosts: DiscussionPost[];
  currentUserId: number;
  currentRole: string;
}) {
  const [posts, setPosts] = useState<DiscussionPost[]>(initialPosts);
  const [newContent, setNewContent] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function reload() {
    router.refresh();
  }

  function post(parentId: number | null, content: string, onDone: () => void) {
    if (!content.trim()) return;
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.POST('/discussions/', {
        body: { lesson_id: lessonId, parent_id: parentId, content: content.trim() },
      });
      if (error || !data) {
        toast.error('Failed to post.');
        return;
      }
      const created = data as DiscussionPost;
      if (parentId == null) {
        setPosts((prev) => [...prev, { ...created, replies: [] }]);
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === parentId
              ? { ...p, replies: [...(p.replies ?? []), { ...created, replies: [] }] }
              : p,
          ),
        );
      }
      onDone();
      toast.success('Posted');
    });
  }

  function remove(postId: number) {
    if (!confirm('Delete this post? Replies will also be removed.')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/discussions/{post_id}', {
        params: { path: { post_id: postId } },
      });
      if (error) {
        toast.error('Failed to delete.');
        return;
      }
      setPosts((prev) =>
        prev
          .filter((p) => p.id !== postId)
          .map((p) => ({
            ...p,
            replies: (p.replies ?? []).filter((r) => r.id !== postId),
          })),
      );
      reload();
    });
  }

  function toggleAnswer(postId: number) {
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.PUT('/discussions/{post_id}/mark-answer', {
        params: { path: { post_id: postId } },
      });
      if (error || !data) {
        toast.error('Failed to update.');
        return;
      }
      const updated = data as { id: number; is_answer: boolean };
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) return { ...p, is_answer: updated.is_answer };
          return {
            ...p,
            replies: (p.replies ?? []).map((r) =>
              r.id === postId ? { ...r, is_answer: updated.is_answer } : r,
            ),
          };
        }),
      );
    });
  }

  const canMark = currentRole === 'admin' || currentRole === 'instructor';

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              post(null, newContent, () => setNewContent(''));
            }}
            className="flex flex-col gap-2"
          >
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Ask a question or start a discussion…"
              rows={3}
              required
            />
            <Button type="submit" size="sm" className="self-start" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Post
            </Button>
          </form>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              canMark={canMark}
              canDelete={p.user_id === currentUserId || currentRole === 'admin'}
              onReply={(content, done) => post(p.id, content, done)}
              onDelete={remove}
              onToggleAnswer={toggleAnswer}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  canMark,
  canDelete,
  onReply,
  onDelete,
  onToggleAnswer,
  pending,
}: {
  post: DiscussionPost;
  currentUserId: number;
  canMark: boolean;
  canDelete: boolean;
  onReply: (content: string, done: () => void) => void;
  onDelete: (id: number) => void;
  onToggleAnswer: (id: number) => void;
  pending: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  return (
    <Card className={cn(post.is_answer && 'border-green-500/50 bg-green-500/[0.02]')}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{post.author_name ?? 'Unknown'}</span>
              {post.is_answer ? (
                <Badge variant="secondary" className="gap-1 border-green-500/50">
                  <CheckCircle2 className="size-3" />
                  Answer
                </Badge>
              ) : null}
              {post.created_at ? (
                <time className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString()}
                </time>
              ) : null}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{post.content}</p>
          </div>
          <div className="flex flex-col gap-1">
            {canMark ? (
              <Button
                size="icon"
                variant="ghost"
                title={post.is_answer ? 'Unmark answer' : 'Mark as answer'}
                onClick={() => onToggleAnswer(post.id)}
              >
                <CheckCircle2
                  className={cn('size-4', post.is_answer && 'text-green-500')}
                />
              </Button>
            ) : null}
            {canDelete ? (
              <Button size="icon" variant="ghost" onClick={() => onDelete(post.id)}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setReplying((v) => !v)}
          >
            <CornerDownRight className="size-3.5" />
            Reply
          </Button>
        </div>

        {replying ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onReply(replyContent, () => {
                setReplyContent('');
                setReplying(false);
              });
            }}
            className="mt-2 flex flex-col gap-2 pl-4"
          >
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              required
              placeholder="Write a reply…"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                Reply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReplying(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {post.replies && post.replies.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 border-l pl-4">
            {post.replies.map((r) => (
              <li key={r.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.author_name ?? 'Unknown'}</span>
                      {r.is_answer ? (
                        <Badge variant="secondary" className="gap-1 border-green-500/50">
                          <CheckCircle2 className="size-3" />
                          Answer
                        </Badge>
                      ) : null}
                      {r.created_at ? (
                        <time className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{r.content}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {canMark ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onToggleAnswer(r.id)}
                        title={r.is_answer ? 'Unmark answer' : 'Mark as answer'}
                      >
                        <CheckCircle2
                          className={cn('size-3.5', r.is_answer && 'text-green-500')}
                        />
                      </Button>
                    ) : null}
                    {r.user_id === currentUserId || canMark ? (
                      <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

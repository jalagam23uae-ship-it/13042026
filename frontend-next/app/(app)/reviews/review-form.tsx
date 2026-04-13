'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Star, Trash2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ReviewForm({
  courseId,
  initialRating,
  initialComment,
  reviewId,
}: {
  courseId: number;
  initialRating: number;
  initialComment: string;
  reviewId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error('Pick a rating between 1 and 5 stars.');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/reviews/', {
        body: { course_id: courseId, rating, comment: comment.trim() || null },
      });
      if (error) {
        toast.error('Failed to save review.');
        return;
      }
      toast.success(reviewId ? 'Review updated' : 'Review posted');
      router.refresh();
    });
  }

  function remove() {
    if (!reviewId) return;
    if (!confirm('Delete your review?')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/reviews/{review_id}', {
        params: { path: { review_id: reviewId } },
      });
      if (error) {
        toast.error('Failed to delete review.');
        return;
      }
      toast.success('Review deleted');
      setRating(0);
      setComment('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <Star
                className={cn(
                  'size-6 transition-colors',
                  n <= rating ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground/40',
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`review-comment-${courseId}`}>Comment (optional)</Label>
        <Textarea
          id={`review-comment-${courseId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="What did you think of this course?"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {reviewId ? 'Update review' : 'Submit review'}
        </Button>
        {reviewId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={remove}
          >
            <Trash2 />
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

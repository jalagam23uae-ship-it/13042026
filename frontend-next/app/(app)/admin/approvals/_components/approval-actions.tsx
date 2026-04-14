'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ApprovalActions({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comments, setComments] = useState('');

  function approve() {
    startTransition(async () => {
      const res = await fetch(`/api/approvals/${id}/approve`, { method: 'PUT' });
      if (!res.ok) {
        toast.error('Failed to approve request.');
        return;
      }
      toast.success('Request approved');
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments.trim() || null }),
      });
      if (!res.ok) {
        toast.error('Failed to reject request.');
        return;
      }
      toast.success('Request rejected');
      setRejectOpen(false);
      setComments('');
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" onClick={approve} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
        >
          <X />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              Optionally add a reason to help the requester understand.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`reject-reason-${id}`}>Reason (optional)</Label>
            <Textarea
              id={`reject-reason-${id}`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide context..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <X />}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

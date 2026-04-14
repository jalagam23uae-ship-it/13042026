'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadInput } from '@/components/common/file-upload-input';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function SubmitAssignmentDialog({
  assignmentId,
  assignmentTitle,
}: {
  assignmentId: number;
  assignmentTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [comments, setComments] = useState('');

  function submit() {
    if (!fileUrl) {
      toast.error('Please upload a file first');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/assignments/submit', {
        body: {
          assignment_id: assignmentId,
          file_url: fileUrl,
          file_name: fileName,
          comments: comments || null,
        } as never,
      });
      if (error) {
        toast.error('Failed to submit.');
        return;
      }
      toast.success('Assignment submitted');
      setOpen(false);
      setFileUrl('');
      setFileName('');
      setComments('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Upload />
            Submit
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit assignment</DialogTitle>
          <DialogDescription>{assignmentTitle}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Attachment *</Label>
            <FileUploadInput
              onUploaded={(result, file) => {
                setFileUrl(result.url);
                setFileName(file.name);
              }}
              label="Choose file"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-comments">Comments (optional)</Label>
            <Textarea
              id="sub-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Notes for the instructor…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !fileUrl}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

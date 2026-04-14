'use client';

import { useState } from 'react';
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
import { useApiMutation } from '@/hooks/use-api-mutation';

export function SubmitAssignmentDialog({
  assignmentId,
  assignmentTitle,
}: {
  assignmentId: number;
  assignmentTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [comments, setComments] = useState('');

  const { mutate: submit, isPending } = useApiMutation(
    () =>
      browserClient().POST('/assignments/submit', {
        body: {
          assignment_id: assignmentId,
          file_url: fileUrl,
          file_name: fileName,
          comments: comments || null,
        },
      }),
    {
      successMessage: 'Assignment submitted',
      errorMessage: 'Failed to submit.',
      onSuccess: () => {
        setOpen(false);
        setFileUrl('');
        setFileName('');
        setComments('');
      },
    },
  );

  function handleSubmit() {
    if (!fileUrl) {
      toast.error('Please upload a file first');
      return;
    }
    submit(undefined);
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
          <Button onClick={handleSubmit} disabled={isPending || !fileUrl}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

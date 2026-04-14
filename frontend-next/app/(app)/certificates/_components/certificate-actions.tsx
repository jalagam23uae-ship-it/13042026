'use client';

import { Download, Loader2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

type Props = {
  courseId: number;
  issued: boolean;
  eligible: boolean;
  certificateId: string | null;
};

export function CertificateActions({ courseId, issued, eligible, certificateId }: Props) {
  const { mutate: claim, isPending } = useApiMutation<
    void,
    { certificate_id?: string; course_title?: string }
  >(
    () =>
      (browserClient() as ReturnType<typeof browserClient>).GET(
        `/certificates/generate/${courseId}` as never,
        {} as never,
      ) as never,
    {
      errorMessage: 'Failed to generate certificate. Make sure you have passed a test.',
      onSuccess: (cert) => {
        toast.success(`Certificate issued: ${cert?.certificate_id ?? ''}`);
      },
    },
  );

  function download() {
    // Open a printable certificate view
    window.open(`/api/certificates/generate/${courseId}`, '_blank');
  }

  if (issued) {
    return (
      <div className="flex w-full gap-2">
        <Button variant="outline" size="sm" onClick={download} className="flex-1 gap-1.5">
          <Download className="size-3.5" />
          Download
        </Button>
        {certificateId && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-muted-foreground"
            onClick={() => {
              navigator.clipboard.writeText(certificateId);
              toast.success('Certificate ID copied');
            }}
          >
            Copy ID
          </Button>
        )}
      </div>
    );
  }

  if (eligible) {
    return (
      <Button
        size="sm"
        onClick={() => claim(undefined)}
        disabled={isPending}
        className="w-full gap-1.5"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
        Claim certificate
      </Button>
    );
  }

  return (
    <Button size="sm" variant="ghost" disabled className="w-full text-muted-foreground">
      Pass a test to unlock
    </Button>
  );
}

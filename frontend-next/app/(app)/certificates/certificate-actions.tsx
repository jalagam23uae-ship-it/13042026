'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type Props = {
  courseId: number;
  issued: boolean;
  eligible: boolean;
};

export function CertificateActions({ courseId, issued, eligible }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.GET('/certificates/generate/{course_id}' as never, {
        params: { path: { course_id: courseId } },
      } as never);
      if (error) {
        toast.error('Failed to generate certificate');
        return;
      }
      toast.success('Certificate generated');
      router.refresh();
    });
  }

  function download() {
    const url = `/api/certificates/generate/${courseId}`;
    window.open(url, '_blank');
  }

  if (issued) {
    return (
      <Button variant="outline" size="sm" onClick={download} className="w-full">
        <Download className="size-3.5" />
        Download
      </Button>
    );
  }

  if (eligible) {
    return (
      <Button size="sm" onClick={generate} disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
        Claim certificate
      </Button>
    );
  }

  return (
    <Button size="sm" variant="ghost" disabled className="w-full">
      Not yet eligible
    </Button>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/uploads';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function AvatarUpload({
  userId,
  initials,
  currentUrl,
}: {
  userId: number;
  initials: string;
  currentUrl?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  const { mutate: upload, isPending } = useApiMutation(
    async (file: File) => {
      const result = await uploadFile(file, 'file');
      const res = await browserClient().PUT('/users/{user_id}' as never, {
        params: { path: { user_id: userId } },
        body: { avatar_url: result.url } as never,
      } as never);
      return { ...res, data: result.url };
    },
    {
      successMessage: 'Avatar updated',
      errorMessage: 'Failed to save avatar',
      onSuccess: (url: string) => setPreview(url),
    },
  );

  function pickFile() {
    fileRef.current?.click();
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    upload(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-16">
          {preview ? <AvatarImage src={preview} alt="" /> : null}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={pickFile}
          disabled={isPending}
          className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow transition-transform hover:scale-110 disabled:opacity-50"
          aria-label="Upload avatar"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Camera className="size-3" />
          )}
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        <Button type="button" variant="ghost" size="sm" onClick={pickFile} disabled={isPending}>
          Change avatar
        </Button>
        <p className="mt-1">JPG, PNG, or GIF. Max 5MB.</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadFile, formatBytes, type UploadResult } from '@/lib/api/uploads';

type Props = {
  kind?: 'file' | 'video';
  accept?: string;
  onUploaded: (result: UploadResult, file: File) => void;
  current?: { url: string; filename?: string } | null;
  label?: string;
};

export function FileUploadInput({
  kind = 'file',
  accept,
  onUploaded,
  current,
  label = 'Upload file',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<(UploadResult & { originalName?: string; size?: number }) | null>(
    current ? { url: current.url, filename: current.filename } : null,
  );

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const result = await uploadFile(file, kind);
      setUploaded({ ...result, originalName: file.name, size: file.size });
      onUploaded(result, file);
      toast.success('File uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {label}
        </Button>
        {uploaded ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]">
              {uploaded.originalName ?? uploaded.filename ?? 'file'}
            </span>
            {uploaded.size ? <span>({formatBytes(uploaded.size)})</span> : null}
            <button
              type="button"
              className="ml-1 rounded hover:bg-muted p-0.5"
              onClick={() => {
                setUploaded(null);
                onUploaded({ url: '' }, new File([], ''));
              }}
              aria-label="Remove file"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

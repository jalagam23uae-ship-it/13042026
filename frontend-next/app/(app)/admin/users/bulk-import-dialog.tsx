'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function BulkImportDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; message: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function downloadTemplate() {
    const header = 'name,email,password,role\n';
    const sample =
      'Alice Smith,alice@example.com,SecurePass123!,student\n' +
      'Bob Jones,bob@example.com,SecurePass123!,instructor\n';
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setErrors([]);
  }

  function upload() {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/api/bulk/import-users', {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (!res.ok) {
          const detail = json?.detail;
          if (detail?.errors && Array.isArray(detail.errors)) {
            setErrors(detail.errors);
            toast.error(detail.message ?? 'Import failed');
          } else {
            toast.error(typeof detail === 'string' ? detail : 'Import failed');
          }
          return;
        }
        setResult(json);
        setErrors([]);
        toast.success(json.message ?? `Imported ${json.created} users`);
        router.refresh();
        if (fileRef.current) fileRef.current.value = '';
        setFile(null);
      } catch {
        toast.error('Network error during import');
      }
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setFile(null);
      setResult(null);
      setErrors([]);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        <Users className="size-3.5" />
        Bulk import
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import users</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple users at once. All rows are validated before
            any are saved — one bad row rejects the entire file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <p className="font-semibold mb-1">Required CSV columns (UTF-8, max 5 000 rows, 2 MiB):</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li><code>name</code> — full name</li>
              <li><code>email</code> — must contain @</li>
              <li><code>password</code> — min 12 characters</li>
              <li><code>role</code> — one of: student, instructor, admin</li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" type="button" onClick={downloadTemplate}>
              <Download className="size-3.5" />
              Download template
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">CSV file</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-accent"
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300">{result.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created: {result.created} · Skipped (duplicates): {result.skipped}
              </p>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive mb-1">Validation errors</p>
              <ul className="text-xs text-destructive/80 list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Close
          </Button>
          <Button onClick={upload} disabled={isPending || !file}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}

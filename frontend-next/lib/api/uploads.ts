/**
 * File upload helper — uploads through the BFF proxy so the backend sees
 * an authenticated `Authorization: Bearer <token>` header set by
 * `app/api/[...path]/route.ts`.
 *
 * The FastAPI `/uploads/file` endpoint returns `{ url: string, filename: string, size: number }`.
 */

export type UploadResult = {
  url: string;
  filename?: string;
  size?: number;
};

export async function uploadFile(file: File, kind: 'file' | 'video' = 'file'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/uploads/${kind}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as UploadResult;
  return data;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

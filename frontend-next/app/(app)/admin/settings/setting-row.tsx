'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type SettingValue = string | number | boolean | null | undefined;

export function SettingRow({
  settingKey,
  initialValue,
  description,
}: {
  settingKey: string;
  initialValue: SettingValue;
  description?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(renderRaw(initialValue));

  function save() {
    startTransition(async () => {
      const client = browserClient();
      // Try to coerce booleans / numbers; fall back to string.
      let coerced: SettingValue = value;
      if (value === 'true') coerced = true;
      else if (value === 'false') coerced = false;
      else if (value !== '' && !isNaN(Number(value))) coerced = Number(value);

      const { error } = await client.PUT('/settings/' as never, {
        body: { [settingKey]: coerced } as never,
      } as never);
      if (error) {
        toast.error('Failed to update setting');
        return;
      }
      toast.success(`Saved ${settingKey}`);
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setValue(renderRaw(initialValue));
    setEditing(false);
  }

  return (
    <tr className="border-b">
      <td className="p-2 font-mono text-xs">{settingKey}</td>
      <td className="p-2 font-mono text-xs">
        {editing ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
            className="h-7 w-full"
            autoFocus
          />
        ) : (
          <span className="break-all">{renderDisplay(initialValue)}</span>
        )}
      </td>
      <td className="p-2 text-xs text-muted-foreground">{description ?? '—'}</td>
      <td className="p-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={save} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-green-600" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={isPending}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit">
            <Pencil className="size-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function renderRaw(v: SettingValue): string {
  if (v == null) return '';
  return String(v);
}

function renderDisplay(v: SettingValue): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

'use client';

import { useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

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
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(renderRaw(initialValue));

  const { mutate: save, isPending } = useApiMutation(
    () => {
      // Try to coerce booleans / numbers; fall back to string.
      let coerced: SettingValue = value;
      if (value === 'true') coerced = true;
      else if (value === 'false') coerced = false;
      else if (value !== '' && !isNaN(Number(value))) coerced = Number(value);
      return browserClient().PUT('/settings/' as never, {
        body: { [settingKey]: coerced } as never,
      } as never);
    },
    {
      successMessage: `Saved ${settingKey}`,
      errorMessage: 'Failed to update setting',
      onSuccess: () => setEditing(false),
    },
  );

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
              if (e.key === 'Enter') save(undefined);
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
            <Button size="sm" variant="ghost" onClick={() => save(undefined)} disabled={isPending}>
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

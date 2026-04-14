import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { SettingRow } from './_components/setting-row';

type SettingEntry = {
  key: string;
  value?: string | number | boolean | null;
  description?: string | null;
  category?: string | null;
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/settings/' as never, {} as never as never as never);
  let entries: SettingEntry[] = [];
  if (Array.isArray(data)) {
    entries = data as SettingEntry[];
  } else if (data && typeof data === 'object') {
    entries = Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: value as SettingEntry['value'],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform-level configuration. Click a row to edit its value.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4 text-muted-foreground" />
            Settings ({entries.length})
          </CardTitle>
          <CardDescription>
            Values fetched from <code className="font-mono">/settings/</code>. Changes are saved via
            <code className="font-mono"> PUT /settings/{'{key}'}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load settings.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settings configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 font-medium">Key</th>
                  <th className="p-2 font-medium">Value</th>
                  <th className="p-2 font-medium">Description</th>
                  <th className="p-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <SettingRow
                    key={entry.key}
                    settingKey={entry.key}
                    initialValue={entry.value}
                    description={entry.description}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateUserForm } from './create-user-form';
import { UserRowActions } from './user-row-actions';
import { BulkImportDialog } from './bulk-import-dialog';

export default async function AdminUsersPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/users/', {});
  const users = (Array.isArray(data) ? data : []) as Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    is_active?: boolean | null;
  }>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only view. Manage and import users below.
          </p>
        </div>
        <BulkImportDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create new user</CardTitle>
          <CardDescription>
            Single user. For bulk creation, use the &ldquo;Bulk import&rdquo; button above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load users.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.is_active ? '✓' : '—'}</TableCell>
                    <TableCell className="text-right">
                      <UserRowActions user={user} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

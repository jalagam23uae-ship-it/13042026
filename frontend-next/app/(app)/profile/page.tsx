import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditProfileForm } from './_components/edit-profile-form';
import { ChangePasswordForm } from './_components/change-password-form';
import { AvatarUpload } from './_components/avatar-upload';

export default async function ProfilePage() {
  const user = await requireUser();
  const initials = user.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const avatarUrl = (user as { avatar_url?: string | null }).avatar_url ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <AvatarUpload userId={user.id} initials={initials} currentUrl={avatarUrl} />
          <div className="flex-1">
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold mb-3">Edit profile</h2>
            <EditProfileForm
              userId={user.id}
              initial={{ name: user.name, email: user.email }}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-3">Change password</h2>
            <ChangePasswordForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

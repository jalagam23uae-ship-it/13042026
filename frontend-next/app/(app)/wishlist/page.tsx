import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { WishlistItemActions } from './wishlist-item-actions';

type WishlistItem = {
  id: number;
  course_id: number;
  course_title?: string | null;
  course_description?: string | null;
  added_at?: string | null;
};

export default async function WishlistPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/wishlist/', {});
  const items = (Array.isArray(data) ? data : []) as WishlistItem[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="text-sm text-muted-foreground">Courses you&apos;ve saved for later.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load wishlist.
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Your wishlist is empty. Add courses from the catalog.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <Heart className="size-5 text-primary" />
                <CardTitle className="mt-2 text-base">
                  {item.course_title ?? `Course ${item.course_id}`}
                </CardTitle>
                {item.course_description ? (
                  <CardDescription className="line-clamp-2">
                    {item.course_description}
                  </CardDescription>
                ) : null}
              </CardHeader>
              {item.added_at ? (
                <CardContent className="text-xs text-muted-foreground">
                  Added {new Date(item.added_at).toLocaleDateString()}
                </CardContent>
              ) : null}
              <CardFooter>
                <WishlistItemActions wishlistId={item.id} courseId={item.course_id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

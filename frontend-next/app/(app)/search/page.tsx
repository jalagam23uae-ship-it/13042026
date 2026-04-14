import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon } from 'lucide-react';
import { SearchForm } from './_components/search-form';

type SearchResult = {
  type: string;
  id: number;
  title: string;
  description?: string | null;
  course_title?: string | null;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q: query = '' } = await searchParams;
  const trimmed = query.trim();

  let results: SearchResult[] = [];
  let failed = false;

  if (trimmed.length > 0) {
    const token = await getSessionToken();
    const client = serverClient(token);
    const { data, error } = await client.GET('/search/', {
      params: { query: { q: trimmed } as never },
    });
    if (error) {
      failed = true;
    } else {
      const raw = data as { results?: SearchResult[] } | SearchResult[] | undefined;
      if (Array.isArray(raw)) {
        results = raw;
      } else if (raw && Array.isArray(raw.results)) {
        results = raw.results;
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Search across courses, lessons, and announcements.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SearchForm defaultQuery={trimmed} />
        </CardContent>
      </Card>

      {trimmed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Type a query above to search.
          </CardContent>
        </Card>
      ) : failed ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Search failed.
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No results for &quot;{trimmed}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <Card key={`${result.type}-${result.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    <SearchIcon className="size-3" />
                    {result.type}
                  </Badge>
                </div>
                {result.course_title ? (
                  <CardDescription>{result.course_title}</CardDescription>
                ) : null}
              </CardHeader>
              {result.description ? (
                <CardContent className="text-sm text-muted-foreground line-clamp-2">
                  {result.description}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

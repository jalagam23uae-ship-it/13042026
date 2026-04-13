'use client';

import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnrollButton } from './enroll-button';
import { WishlistButton } from './wishlist-button';

type Course = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  total_lessons?: number | null;
  total_duration_min?: number | null;
  is_enrolled?: boolean | null;
};

export function EnrollmentBrowser({
  courses,
  categories,
  wishlistIds,
}: {
  courses: Course[];
  categories: string[];
  wishlistIds: number[];
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [wished, setWished] = useState<Set<number>>(new Set(wishlistIds));

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (category && c.category !== category) return false;
      if (!lower) return true;
      return (
        c.title.toLowerCase().includes(lower) ||
        (c.description ?? '').toLowerCase().includes(lower)
      );
    });
  }, [courses, search, category]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Browse catalog</CardTitle>
        <CardDescription>Find and enroll in new courses.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat">Category</Label>
            <select
              id="cat"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No courses match your filters.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-2 rounded-md border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <BookOpen className="size-5 text-primary" />
                  <div className="flex items-center gap-1">
                    {course.category ? (
                      <Badge variant="outline" className="text-[10px]">
                        {course.category}
                      </Badge>
                    ) : null}
                    {course.is_enrolled ? (
                      <Badge variant="secondary">Enrolled</Badge>
                    ) : null}
                    <WishlistButton
                      courseId={course.id}
                      initiallyWished={wished.has(course.id)}
                      onToggle={(isWished) => {
                        setWished((prev) => {
                          const next = new Set(prev);
                          if (isWished) next.add(course.id);
                          else next.delete(course.id);
                          return next;
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="font-medium line-clamp-1">{course.title}</div>
                {course.description ? (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {course.description}
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {course.total_lessons ? <span>{course.total_lessons} lessons</span> : null}
                  {course.total_duration_min ? (
                    <span>{course.total_duration_min} min</span>
                  ) : null}
                </div>
                <EnrollButton
                  courseId={course.id}
                  alreadyEnrolled={!!course.is_enrolled}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

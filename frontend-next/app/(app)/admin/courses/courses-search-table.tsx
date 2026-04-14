'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Pencil, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeleteCourseButton } from './delete-course-button';

type Course = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  enrollment_count?: number | null;
  is_active?: boolean | null;
  approval_status?: string | null;
};

export function CoursesSearchTable({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? courses.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          (c.category ?? '').toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q)
        );
      })
    : courses;

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {query ? `No courses matching "${query}".` : 'No courses yet. Click "New course" to get started.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">
                  {course.title}
                  {course.description ? (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {course.description}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {course.category ? (
                    <Badge variant="outline">{course.category}</Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>{course.lesson_count ?? 0}</TableCell>
                <TableCell>{course.enrollment_count ?? 0}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {course.approval_status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold w-fit">
                        <Clock className="size-3" /> Pending approval
                      </span>
                    ) : course.is_active === false ? (
                      <Badge variant="destructive">Inactive</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                    >
                      <Pencil />
                      Manage content
                    </Link>
                    <DeleteCourseButton id={course.id} title={course.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {query && filtered.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {courses.length} courses
        </p>
      ) : null}
    </div>
  );
}

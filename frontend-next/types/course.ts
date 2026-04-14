// TODO: once backend exposes CourseOut / SectionOut in OpenAPI,
// re-export from lib/api/schema.ts instead of re-declaring here.
import type { components } from '@/lib/api/schema';

// Re-export from generated schema.
export type Lesson = components['schemas']['LessonOut'];

export type Section = {
  id: number;
  title: string;
  sort_order: number;
};

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  enrollment_count?: number | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  thumbnail_url?: string | null;
};

export type AdminCourseSummary = Course;

export type CourseDetailResponse = {
  course?: { id: number; title: string; description?: string | null };
  total_lessons?: number;
  completed_lessons?: number;
  completion_pct?: number;
  sections?: Section[];
  lessons?: Lesson[];
};

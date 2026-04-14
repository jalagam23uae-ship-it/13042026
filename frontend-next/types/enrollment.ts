// TODO: once backend exposes EnrollmentOut in OpenAPI,
// re-export from lib/api/schema.ts instead of re-declaring here.

export type Enrollment = {
  id?: number;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  course_id?: number;
  course_title?: string | null;
  category?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
  enrolled_at?: string | null;
};

export type AvailableCourse = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  duration_min?: number | null;
  is_active?: boolean | null;
};

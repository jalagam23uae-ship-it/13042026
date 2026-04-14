import type { components } from '@/lib/api/schema';

export type Assignment = components['schemas']['AssignmentOut'];

export type AssignmentSubmission = {
  id: number;
  assignment_id: number;
  user_id: number;
  student_name?: string | null;
  student_email?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  comments?: string | null;
  grade?: number | null;
  feedback?: string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
};

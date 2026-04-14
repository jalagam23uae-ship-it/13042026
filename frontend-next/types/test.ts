import type { components } from '@/lib/api/schema';

export type Test = components['schemas']['TestOut'];
export type TestResult = components['schemas']['TestResultOut'];
export type Question = components['schemas']['QuestionOut'];

export type MineStats = {
  best: number;
  passed: boolean;
  attempts: number;
};

export type ResultRow = {
  id: number;
  test_id: number;
  test_title?: string | null;
  user_id?: number;
  student_name?: string | null;
  student_email?: string | null;
  score?: number | null;
  total_marks?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  attempt_no?: number | null;
  taken_at?: string | null;
};

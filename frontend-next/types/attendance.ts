import type { components } from '@/lib/api/schema';

export type AttendanceRecord = components['schemas']['AttendanceOut'];

export type AttendanceRow = {
  id: number;
  session_id?: number | null;
  session_title?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  duration_min?: number | null;
  status?: string | null;
};

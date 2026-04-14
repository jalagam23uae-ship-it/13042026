import type { components } from '@/lib/api/schema';

export type SessionItem = components['schemas']['SessionOut'];

export type SessionFormValues = {
  title: string;
  description?: string;
  course_id?: number | null;
  starts_at: string;
  ends_at: string;
  location?: string;
  meeting_url?: string;
  max_attendees?: number | null;
};

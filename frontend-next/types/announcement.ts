// TODO: once backend exposes AnnouncementOut in OpenAPI,
// re-export from lib/api/schema.ts instead of re-declaring here.

export type Announcement = {
  id: number;
  title: string;
  body?: string | null;
  author_id?: number | null;
  author_name?: string | null;
  course_id?: number | null;
  is_pinned?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

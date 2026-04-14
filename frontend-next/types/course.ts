export type Lesson = {
  id: number;
  course_id: number;
  section_id?: number | null;
  title: string;
  description?: string | null;
  video_url?: string | null;
  content_type?: string | null;
  duration_min?: number | null;
  sort_order?: number | null;
  is_free?: boolean | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  completed?: boolean | null;
  progress_pct?: number | null;
  last_position?: number | null;
};

export type Section = {
  id: number;
  title: string;
  sort_order: number;
};

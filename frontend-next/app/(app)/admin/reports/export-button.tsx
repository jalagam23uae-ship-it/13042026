'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv, toCsv } from '@/lib/csv';
import { toast } from 'sonner';

type LessonDropoff = {
  course: string;
  lessons: Array<{
    title: string;
    sort_order: number;
    started: number;
    completed: number;
  }>;
};

export function ExportReportsButton({ reports }: { reports: LessonDropoff[] }) {
  function exportAll() {
    const rows: Array<Array<string | number>> = [
      ['Course', 'Lesson #', 'Lesson title', 'Started', 'Completed', 'Drop-off %'],
    ];
    for (const r of reports) {
      for (const l of r.lessons) {
        const dropoff = l.started > 0 ? Math.round(((l.started - l.completed) / l.started) * 100) : 0;
        rows.push([r.course, l.sort_order, l.title, l.started, l.completed, dropoff]);
      }
    }
    const csv = toCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`lesson-dropoff-${stamp}.csv`, csv);
    toast.success('Report exported');
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={exportAll} disabled={!reports.length}>
      <Download className="size-3.5" />
      Export CSV
    </Button>
  );
}

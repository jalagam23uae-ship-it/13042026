import { cn } from '@/lib/utils';

export function ProgressBar({
  pct,
  className,
  barClassName,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

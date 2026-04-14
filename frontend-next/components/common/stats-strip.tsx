import type { ComponentType, SVGProps } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type StatItem = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: Icon;
  iconBg?: string;
  iconColor?: string;
};

export function StatsStrip({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-5',
        className,
      )}
    >
      {items.map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
        <Card key={label}>
          <CardContent className="p-4">
            {Icon && (
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl',
                    iconBg ?? 'bg-muted',
                  )}
                >
                  <Icon width={16} height={16} className={iconColor ?? 'text-foreground'} />
                </div>
              </div>
            )}
            <div className={Icon ? 'mt-3' : undefined}>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                {label}
              </p>
              {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

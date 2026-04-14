import type { ComponentType, SVGProps } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon?: Icon;
  message: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Icon width={20} height={20} className="text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

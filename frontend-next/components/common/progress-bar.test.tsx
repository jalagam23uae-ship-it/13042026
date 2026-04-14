import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './progress-bar';

describe('<ProgressBar />', () => {
  it('renders a 0% bar', () => {
    const { container } = render(<ProgressBar pct={0} />);
    const fill = container.querySelector('[style*="width"]') as HTMLElement | null;
    expect(fill?.style.width).toBe('0%');
  });

  it('renders a 50% bar', () => {
    const { container } = render(<ProgressBar pct={50} />);
    const fill = container.querySelector('[style*="width"]') as HTMLElement | null;
    expect(fill?.style.width).toBe('50%');
  });

  it('clamps values over 100', () => {
    const { container } = render(<ProgressBar pct={250} />);
    const fill = container.querySelector('[style*="width"]') as HTMLElement | null;
    expect(fill?.style.width).toBe('100%');
  });

  it('clamps values below 0', () => {
    const { container } = render(<ProgressBar pct={-25} />);
    const fill = container.querySelector('[style*="width"]') as HTMLElement | null;
    expect(fill?.style.width).toBe('0%');
  });

  it('accepts classNames for root and bar', () => {
    const { container } = render(
      <ProgressBar pct={40} className="root-x" barClassName="bar-x" />,
    );
    expect(container.querySelector('.root-x')).not.toBeNull();
    expect(container.querySelector('.bar-x')).not.toBeNull();
  });
});

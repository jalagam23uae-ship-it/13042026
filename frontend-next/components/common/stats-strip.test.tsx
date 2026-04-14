import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookOpen, Users } from 'lucide-react';
import { StatsStrip, type StatItem } from './stats-strip';

describe('<StatsStrip />', () => {
  const items: StatItem[] = [
    {
      label: 'Total Courses',
      value: 42,
      sub: '5 categories',
      icon: BookOpen,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Total Enrolled',
      value: 987,
      sub: 'students',
      icon: Users,
    },
  ];

  it('renders all items in the order provided', () => {
    render(<StatsStrip items={items} />);
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('Total Enrolled')).toBeInTheDocument();
  });

  it('renders numeric values', () => {
    render(<StatsStrip items={items} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('987')).toBeInTheDocument();
  });

  it('renders the sub label when provided', () => {
    render(<StatsStrip items={items} />);
    expect(screen.getByText('5 categories')).toBeInTheDocument();
    expect(screen.getByText('students')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(
      <StatsStrip
        items={[{ label: 'Avg score', value: '78%' }]}
      />,
    );
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('omits the sub text when not provided', () => {
    render(<StatsStrip items={[{ label: 'X', value: 1 }]} />);
    // Only the label + value — no crash on missing sub.
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders an empty state for an empty items array', () => {
    const { container } = render(<StatsStrip items={[]} />);
    // No Card elements should render.
    expect(container.querySelectorAll('[class*="Card"]').length).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';
import { Bell } from 'lucide-react';

describe('<EmptyState />', () => {
  it('renders the message', () => {
    render(<EmptyState message="No notifications yet" />);
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('renders without an icon', () => {
    const { container } = render(<EmptyState message="No data" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders an icon when provided', () => {
    const { container } = render(<EmptyState icon={Bell} message="No notifications" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('accepts a className', () => {
    const { container } = render(
      <EmptyState message="x" className="custom-cls" />,
    );
    // The root Card element should pick up the class.
    expect(container.querySelector('.custom-cls')).not.toBeNull();
  });
});

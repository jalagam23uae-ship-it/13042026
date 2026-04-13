import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeMarkdown } from './safe-markdown';

describe('SafeMarkdown', () => {
  it('renders basic markdown as text', () => {
    render(<SafeMarkdown text="Hello **world**" />);
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('strips script tags and onerror attributes (XSS regression test)', () => {
    const payload =
      '<img src=x onerror="alert(1)"><script>alert(1)</script>After';
    const { container } = render(<SafeMarkdown text={payload} />);
    // No script tag rendered
    expect(container.querySelector('script')).toBeNull();
    // No onerror attribute
    expect(container.querySelector('[onerror]')).toBeNull();
    // Text after the payload is still present
    expect(container.textContent).toContain('After');
  });

  it('returns null for empty input', () => {
    const { container } = render(<SafeMarkdown text={null} />);
    expect(container.firstChild).toBeNull();
  });
});

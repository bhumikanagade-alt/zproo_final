import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the official asset with alt text and aspect-correct dimensions', () => {
    render(<Logo height={40} />);
    const img = screen.getByRole('img', { name: 'ZPROO GO' });
    expect(img).toHaveAttribute('src', '/assets/brand/zproo-go-logo.png');
    expect(img).toHaveAttribute('height', '40');
    expect(img).toHaveAttribute('width', String(Math.round((302 / 77) * 40)));
    expect(img).toHaveStyle({ height: '40px', width: 'auto' });
  });

  it('can sit on a white plate for coloured backgrounds', () => {
    const { container } = render(<Logo surface="plate" />);
    expect(container.firstElementChild?.tagName).toBe('SPAN');
    expect(container.firstElementChild).toHaveClass('bg-white');
  });
});

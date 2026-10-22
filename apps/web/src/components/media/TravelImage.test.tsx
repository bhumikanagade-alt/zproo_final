import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('TravelImage', () => {
  it('shows a labelled illustration when no photo has been published', async () => {
    vi.resetModules();
    vi.doMock('@/config/imageManifest.json', () => ({ default: {} }));
    const { TravelImage } = await import('./TravelImage');
    render(<TravelImage id="destinations/goa" sizes="50vw" />);
    expect(screen.getByRole('img', { name: 'Beach in Goa with palm trees' }).tagName).toBe('svg');
  });

  it('renders responsive WebP sources once a photo is published', async () => {
    vi.resetModules();
    vi.doMock('@/config/imageManifest.json', () => ({
      default: {
        'destinations/goa': {
          width: 2000,
          height: 1333,
          widths: [480, 960, 1600],
          color: '#3a6b8c',
        },
      },
    }));
    const { TravelImage } = await import('./TravelImage');
    render(<TravelImage id="destinations/goa" sizes="50vw" />);
    const img = screen.getByRole('img', { name: 'Beach in Goa with palm trees' });
    expect(img).toHaveAttribute('src', '/assets/destinations/goa-1600.webp');
    expect(img).toHaveAttribute(
      'srcset',
      '/assets/destinations/goa-480.webp 480w, /assets/destinations/goa-960.webp 960w, /assets/destinations/goa-1600.webp 1600w',
    );
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('sizes', '50vw');
  });
});

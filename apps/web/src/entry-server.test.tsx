// @vitest-environment node
import { addDays, todayIso } from '@zproo/validation';
import { describe, expect, it } from 'vitest';
import indexable from '../scripts/indexable-pages.json';
import { render } from './entry-server';

describe('prerendering', () => {
  it('renders the home page with its content and meta tags', async () => {
    const html = await render('/');
    expect(html).toContain('Travel Smarter.');
    expect(html).toContain('<title>ZPROO GO — Travel Smarter. Go Further.</title>');
    expect(html).toMatch(/<meta name="description" content="Book flights, buses, trains/);
    expect(html).toContain('application/ld+json');
    // The booking widget is browser-only: its skeleton is prerendered instead.
    expect(html).toContain('aria-label="Loading search"');
  });

  it('never freezes a date into prerendered HTML', async () => {
    const html = await render('/');
    for (let day = 0; day <= 30; day++) expect(html).not.toContain(addDays(todayIso(), day));
  });

  it.each(indexable)('renders %s without throwing', async (path) => {
    const html = await render(path);
    expect(html).toMatch(/<h1[^>]*>/);
  });
});

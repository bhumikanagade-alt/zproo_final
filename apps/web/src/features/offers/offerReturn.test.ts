import { describe, expect, it } from 'vitest';
import { offersUrl, safeReturnPath } from './offerReturn';

describe('offer return links', () => {
  it('builds an offers url with the service and return path', () => {
    const u = new URL(offersUrl('cabs', '/cabs/payment', 'payment'), 'http://x');
    expect(u.pathname).toBe('/offers');
    expect(u.searchParams.get('service')).toBe('cabs');
    expect(u.searchParams.get('returnTo')).toBe('/cabs/payment');
  });
  it('only allows same-site return paths', () => {
    expect(safeReturnPath('/cabs/payment')).toBe('/cabs/payment');
    expect(safeReturnPath('//evil.com')).toBeNull();
    expect(safeReturnPath('https://evil.com')).toBeNull();
    expect(safeReturnPath('/\\evil.com')).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
  });
});

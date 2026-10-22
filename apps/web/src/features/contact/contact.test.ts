import { describe, expect, it } from 'vitest';
import { isLettersName, isStrictEmail, isTenDigitMobile, sanitizeContactName, sanitizeContactPhone } from './submit';

describe('help / contact form validation', () => {
  it('accepts letters only in the name', () => {
    expect(sanitizeContactName('Amit 123 Sharma!')).toBe('Amit Sharma');
    expect(isLettersName('Amit Sharma')).toBe(true);
    expect(isLettersName('A')).toBe(false);
    expect(isLettersName('Amit9')).toBe(false);
  });

  it('checks the email properly', () => {
    expect(isStrictEmail('amit@example.com')).toBe(true);
    for (const bad of ['amit', 'amit@', 'amit@example', 'amit@@example.com', 'amit..x@example.com', 'a@b.c', '.amit@example.com'])
      expect(isStrictEmail(bad)).toBe(false);
  });

  it('takes only 10 digits and refuses fake numbers', () => {
    expect(sanitizeContactPhone('98a76-54 3210 99')).toBe('9876543210');
    expect(sanitizeContactPhone('+91 98765 43210')).toBe('9876543210');
    expect(isTenDigitMobile('9822012345')).toBe(true);
    for (const bad of ['0000000000', '9999999999', '98765', '5876543210', '9898989898', '9000000000'])
      expect(isTenDigitMobile(bad)).toBe(false);
  });
});

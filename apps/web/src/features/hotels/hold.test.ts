import { beforeEach, describe, expect, it } from 'vitest';
import { HOLD_MINUTES, clearHold, formatCountdown, holdRemainingSeconds, restartHold } from './hold';

describe('15-minute price hold', () => {
  beforeEach(() => clearHold());

  it('starts at 15 minutes and counts down', () => {
    const t0 = 1_000_000;
    expect(holdRemainingSeconds('a', t0)).toBe(HOLD_MINUTES * 60);
    expect(holdRemainingSeconds('a', t0 + 60_000)).toBe(HOLD_MINUTES * 60 - 60);
  });

  it('expires after 15 minutes and restarts with a new key', () => {
    const t0 = 2_000_000;
    holdRemainingSeconds('a', t0);
    expect(holdRemainingSeconds('a', t0 + HOLD_MINUTES * 60_000 + 1000)).toBe(0);
    expect(holdRemainingSeconds('b', t0 + HOLD_MINUTES * 60_000 + 1000)).toBe(HOLD_MINUTES * 60);
  });

  it('can be restarted and formats mm:ss', () => {
    restartHold('a');
    expect(holdRemainingSeconds('a')).toBeGreaterThan(HOLD_MINUTES * 60 - 5);
    expect(formatCountdown(125)).toBe('02:05');
  });
});

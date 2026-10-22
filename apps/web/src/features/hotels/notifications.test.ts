import { describe, expect, it } from 'vitest';
import { timeAgo, useHotelNotifications } from './notifications';

const item = (reference: string, userId = 'u1') => ({
  reference,
  userId,
  hotelName: 'Test Hotel',
  city: 'Goa',
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  createdAt: new Date().toISOString(),
});

describe('hotel booking notifications', () => {
  it('records a confirmed booking for the bell', () => {
    useHotelNotifications.getState().clear();
    useHotelNotifications.getState().add(item('ZPH-2026-AAAAAA'));
    expect(useHotelNotifications.getState().items.length).toBe(1);
    expect(useHotelNotifications.getState().items[0]?.hotelName).toBe('Test Hotel');
  });

  it('does not duplicate the same reference and keeps newest first', () => {
    useHotelNotifications.getState().clear();
    useHotelNotifications.getState().add(item('ZPH-2026-AAAAAA'));
    useHotelNotifications.getState().add(item('ZPH-2026-AAAAAA'));
    useHotelNotifications.getState().add(item('ZPH-2026-BBBBBB'));
    const refs = useHotelNotifications.getState().items.map((i) => i.reference);
    expect(refs).toEqual(['ZPH-2026-BBBBBB', 'ZPH-2026-AAAAAA']);
  });

  it('formats relative time', () => {
    const now = Date.parse('2026-10-04T12:00:00Z');
    expect(timeAgo('2026-10-04T12:00:00Z', now)).toBe('Just now');
    expect(timeAgo('2026-10-04T11:30:00Z', now)).toBe('30 min ago');
    expect(timeAgo('2026-10-04T09:00:00Z', now)).toBe('3 hours ago');
    expect(timeAgo('2026-10-02T12:00:00Z', now)).toBe('2 days ago');
  });
});

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@zproo/ui';
import { Bell, CalendarCheck, Megaphone } from 'lucide-react';
import type { UserNotification } from '@zproo/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import { bookingKeys } from '@/features/checkout/api';
import { timeAgo, useHotelNotifications } from '@/features/hotels/notifications';
import { useReadNotifications } from '@/features/notifications/readState';
import { apiGet } from '@/services/http';

type NotificationType = 'booking' | 'campaign';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: typeof CalendarCheck | typeof Megaphone;
  time: string;
  /** Used to order the list, newest first. */
  at: number;
  route: string | null;
}

interface BookingListItem {
  reference: string;
  serviceType: 'BUS' | 'FLIGHT';
  status:
    | 'INITIATED'
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REFUND_PENDING'
    | 'REFUNDED';
  paymentStatus: string;
  cancelledAt?: string | null;
  title: string;
  subtitle: string;
  travelDate: string;
  totalPaise: number;
  createdAt: string;
}

/** Confirmed bookings stay in the bell for this long. */
const BOOKING_WINDOW_MS = 3 * 86_400_000;

export function NotificationBell({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  // Opened by a click on the placeholder shown before this menu's code loaded: open it once
  // mounted (a tick later, so the trigger is positioned first).
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!defaultOpen) return;
    const frame = requestAnimationFrame(() => setMenuOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [defaultOpen]);
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const isSignedIn = status === 'authenticated' && user !== null;
  const userId = user ? String(user.id) : '';

  /* Bookings: a confirmed, paid booking shows up as "Booking Confirmed" for a few days. */
  const { data: bookings = [] } = useQuery<BookingListItem[]>({
    queryKey: bookingKeys.bookings,
    queryFn: () => apiGet<BookingListItem[]>('/bookings'),
    enabled: isSignedIn,
    refetchInterval: isSignedIn ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  /* Campaigns sent from the admin panel (Marketing → Notifications). */
  const { data: campaigns = [] } = useQuery<UserNotification[]>({
    queryKey: ['notifications', userId],
    queryFn: () => apiGet<UserNotification[]>('/notifications'),
    enabled: isSignedIn,
    refetchInterval: isSignedIn ? 60_000 : false,
    refetchOnWindowFocus: true,
    retry: false,
  });

  /* Hotel stays are confirmed in the browser, so the payment page records them in a small store. */
  const hotelItems = useHotelNotifications((state) => state.items);

  const readIds = useReadNotifications((state) => state.read[userId]);
  const markRead = useReadNotifications((state) => state.markRead);
  const readSet = new Set(readIds ?? []);

  const now = Date.now();
  const items: NotificationItem[] = isSignedIn
    ? [
        ...campaigns.map((c): NotificationItem => ({
          id: `campaign-${c.id}`,
          type: 'campaign',
          title: c.title,
          message: c.body,
          icon: Megaphone,
          time: timeAgo(c.sentAt),
          at: Date.parse(c.sentAt),
          route: c.linkPath,
        })),
        ...bookings
          .filter(
            (b) =>
              (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
              (b.paymentStatus === 'SUCCESS' || b.paymentStatus === 'PAID') &&
              now - Date.parse(b.createdAt) < BOOKING_WINDOW_MS,
          )
          .map((b): NotificationItem => ({
            id: `booking-${b.reference}`,
            type: 'booking',
            title: 'Booking Confirmed',
            message: `${b.title} (${b.reference}) is confirmed.`,
            icon: CalendarCheck,
            time: timeAgo(b.createdAt),
            at: Date.parse(b.createdAt),
            route: '/bookings',
          })),
        ...bookings
          .filter(
            (b) =>
              (b.status === 'CANCELLED' || b.status === 'REFUND_PENDING' || b.status === 'REFUNDED') &&
              b.cancelledAt &&
              // Only cancellations of paid bookings (an unpaid hold that simply timed out is not news).
              ['SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(b.paymentStatus) &&
              now - Date.parse(b.cancelledAt) < BOOKING_WINDOW_MS,
          )
          .map((b): NotificationItem => ({
            id: `cancelled-${b.reference}`,
            type: 'booking',
            title: 'Booking Cancelled',
            message:
              b.status === 'REFUNDED' || b.status === 'REFUND_PENDING'
                ? `${b.title} (${b.reference}) is cancelled. Your refund is on its way.`
                : `${b.title} (${b.reference}) is cancelled.`,
            icon: CalendarCheck,
            time: timeAgo(b.cancelledAt as string),
            at: Date.parse(b.cancelledAt as string),
            route: '/bookings',
          })),
        ...hotelItems
          .filter((item) => item.userId === userId)
          .map((item): NotificationItem => ({
            id: `hotel-${item.reference}`,
            type: 'booking',
            title: 'Hotel Booking Confirmed',
            message: `Your stay at ${item.hotelName}, ${item.city} is confirmed (${item.reference}).`,
            icon: CalendarCheck,
            time: timeAgo(item.createdAt),
            at: Date.parse(item.createdAt),
            route: `/hotels/confirmation?ref=${encodeURIComponent(item.reference)}`,
          })),
      ].sort((a, b) => b.at - a.at)
    : [];

  const unreadCount = items.filter((n) => !readSet.has(n.id)).length;

  const handleOpenChange = (open: boolean) => {
    setMenuOpen(open);
    // Opening the bell shows everything, so it counts as read once it closes again.
    if (!open && userId && items.length) markRead(userId, items.map((n) => n.id));
  };

  const handleNotificationSelect = (notification: NotificationItem) => {
    if (userId) markRead(userId, [notification.id]);
    if (notification.route) void navigate(notification.route);
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-primary-light"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell aria-hidden className="size-5 text-foreground/80 transition-transform duration-200 group-hover:scale-105" />

          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-card"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl p-2">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-foreground">Notifications</p>
              <p className="mt-0.5 text-xs font-normal text-muted">Booking updates and announcements</p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-bold text-primary">{unreadCount} new</span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="max-h-[360px] overflow-y-auto">
          {!isSignedIn ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Sign in to see your notifications.</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">You&apos;re all caught up. New updates will appear here.</p>
          ) : (
            items.map((notification) => {
              const Icon = notification.icon;
              const unread = !readSet.has(notification.id);

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="mb-1 items-start gap-3 rounded-xl px-3 py-3 last:mb-0"
                  onSelect={() => handleNotificationSelect(notification)}
                >
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      notification.type === 'booking' ? 'bg-green-50 text-green-600' : 'bg-primary-light text-primary'
                    }`}
                  >
                    <Icon aria-hidden className="size-5!" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{notification.title}</span>
                      {unread && <span aria-label="Unread notification" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </span>

                    <span className="mt-1 block text-xs font-normal leading-5 text-muted">{notification.message}</span>

                    <span className="mt-1.5 block text-[11px] font-medium text-muted/80">{notification.time}</span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="justify-center font-bold text-primary hover:text-primary" onSelect={() => void navigate('/offers')}>
          View all offers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

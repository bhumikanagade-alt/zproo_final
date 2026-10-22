/**
 * Bike rental business rules and pricing structure.
 *
 * ⚠ The business rules are still pending sign-off, so every number below is a placeholder kept
 * in one place. When the backend owns pricing, the quote will come from the API and this file
 * can shrink to display-only copy.
 */
import type { BikeCategory, PaymentMethod, RentalExtra } from './types';

/** Longest bike name / model text accepted in the bike search boxes. */
export const BIKE_NAME_MAX = 20;

export const RULES = {
  /** GST applied to rental + add-ons (estimate). */
  taxRate: 0.18,
  /** Flat fee when the bike is returned to a different hub than it was picked up from. */
  oneWayFee: 150,
  /** Rentals of 3+ days get 5% off, 7+ days get 10% off the rental charge. */
  discounts: [
    { minHours: 168, rate: 0.1, label: 'Weekly discount (10%)' },
    { minHours: 72, rate: 0.05, label: 'Multi-day discount (5%)' },
  ],
  /** Earliest pickup is this many hours from now. */
  leadTimeHours: 2,
  /** Longest rental in days. */
  maxDays: 30,
  /** Time-slot window and step used by the time selectors. */
  slotStartHour: 6,
  slotEndHour: 22,
  slotStepMinutes: 30,
  minRiderAge: 18,
  /** Cancellation copy shown on the booking pages. */
  cancellation: 'Free cancellation up to 6 hours before pickup.',
} as const;

export const CATEGORY_META: Record<BikeCategory, { label: string; blurb: string }> = {
  scooter: { label: 'Scooter', blurb: 'Easy, gearless city riding' },
  commuter: { label: 'Commuter', blurb: 'Efficient everyday motorcycles' },
  sports: { label: 'Sports', blurb: 'Fast and sharp-handling' },
  cruiser: { label: 'Cruiser', blurb: 'Relaxed highway touring' },
  adventure: { label: 'Adventure', blurb: 'Built for long and rough roads' },
  electric: { label: 'Electric', blurb: 'Silent, zero-emission rides' },
};

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; blurb: string }> = {
  upi: { label: 'UPI', blurb: 'Pay with any UPI app using your UPI ID' },
  card: { label: 'Credit / debit card', blurb: 'Visa, Mastercard, RuPay' },
  netbanking: { label: 'Net banking', blurb: 'Pay from your bank account' },
  'pay-at-pickup': { label: 'Pay at pickup', blurb: 'Pay the rental at the hub when you collect the bike' },
};

export const PAYMENT_ORDER: PaymentMethod[] = ['upi', 'card', 'netbanking', 'pay-at-pickup'];

export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Maharashtra'] as const;

/** Demo-only inputs that trigger a declined payment, so the failure state can be tested. */
export const DEMO_DECLINE = { card: '4000000000000002', upi: 'fail@upi' } as const;

export const CATEGORIES = Object.keys(CATEGORY_META) as BikeCategory[];

export const EXTRAS: RentalExtra[] = [
  { id: 'helmet', label: 'Extra helmet', description: 'ISI-certified helmet for a pillion rider.', perDay: 60 },
  { id: 'phone-mount', label: 'Phone holder', description: 'Secure handlebar mount with USB charging.', perDay: 40 },
  { id: 'saddle-bags', label: 'Saddle bags', description: 'Weather-proof bags for luggage (20 L).', perDay: 150 },
  { id: 'damage-waiver', label: 'Damage waiver', description: 'Reduces your liability for minor scratches and dents.', perDay: 120 },
];

export const REQUIRED_DOCUMENTS = [
  'Original valid driving licence (two-wheeler category)',
  'Government photo ID (Aadhaar, passport or voter ID)',
  'Booking reference (shown on the confirmation page)',
];

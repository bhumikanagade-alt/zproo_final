/**
 * Parcel module reference data (demo). Rates, cities and services are sample values until a real
 * courier / rate provider is connected — swap `fetchQuote` in `logic.ts` for an API call.
 */
export const CITIES = [
  'Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Goa', 'Jaipur', 'Ahmedabad', 'Surat',
] as const;

export const PARCEL_TYPES = ['Documents', 'Clothes', 'Electronics', 'Fragile', 'Food', 'Other'] as const;
/** Icon name per parcel type (same order as PARCEL_TYPES). */
export const TYPE_ICONS = ['doc', 'shirt', 'phone', 'glass', 'food', 'box'] as const;

/** [label, flat fee in ₹]. Index 1 (insurance) is priced from the declared value instead. */
export const HANDLING: readonly (readonly [string, number])[] = [
  ['Fragile - handle with care', 30],
  ['Add insurance', 0],
  ['Signature on delivery', 0],
];

export type ServiceKey = 'Standard' | 'Express' | 'Same-day';

export const SERVICES: readonly { k: ServiceKey; m: number; desc: string }[] = [
  { k: 'Standard', m: 1, desc: 'Door to door' },
  { k: 'Express', m: 1.5, desc: 'Priority handling' },
  { k: 'Same-day', m: 2.2, desc: 'Within the same city only' },
];

export const GST_RATE = 0.18;

export const TRUST: readonly (readonly [icon: string, title: string, text: string])[] = [
  ['shield', 'Secure payments', 'UPI, cards, net banking, pay later'],
  ['home', 'Doorstep pickup', 'We collect from the sender'],
  ['wallet', 'Easy refunds', 'Straight to your source'],
  ['clock', '24×7 support', 'Chat or call, any time'],
];

/** Tracking stages, in order. */
export const TRACK_STEPS = ['Booked', 'Picked up', 'In transit', 'Out for delivery', 'Delivered'] as const;

export const SLOTS = ['Morning (9 AM – 12 PM)', 'Afternoon (12 – 4 PM)', 'Evening (4 – 8 PM)'] as const;

/** First three PIN digits → city (used to auto-detect the city from a PIN code). */
export const PIN_PREFIX: Record<string, (typeof CITIES)[number]> = {
  '411': 'Pune', '400': 'Mumbai', '110': 'Delhi', '560': 'Bengaluru', '600': 'Chennai',
  '500': 'Hyderabad', '403': 'Goa', '302': 'Jaipur', '380': 'Ahmedabad', '395': 'Surat',
};

export const POPULAR_ROUTES: readonly (readonly [string, string])[] = [
  ['Pune', 'Mumbai'], ['Delhi', 'Jaipur'], ['Bengaluru', 'Chennai'],
  ['Ahmedabad', 'Surat'], ['Mumbai', 'Goa'], ['Hyderabad', 'Bengaluru'],
];

export const HELP_FAQ: readonly (readonly [q: string, a: string])[] = [
  ['What can I not send?', 'Cash, jewellery, flammable or hazardous goods, perishables without proper packing and illegal items cannot be sent.'],
  ['How is the price calculated?', 'We charge on the larger of actual and volumetric weight (L × W × H ÷ 5000), plus handling, insurance and 18% GST. Prices on this site are sample values.'],
  ['How does pickup work?', 'Choose a date and time slot. Our partner collects from the sender address.'],
  ['Can I cancel a parcel?', 'Yes, until it is picked up. The refund goes to your ZPROO Wallet instantly.'],
  ['What is the delivery OTP?', 'A 4-digit code. Share it with the delivery partner only when you receive the parcel.'],
];

export const CANCEL_REASONS = ['Booked by mistake', 'Change of plans', 'Found a better option', 'Wrong address', 'Other'] as const;

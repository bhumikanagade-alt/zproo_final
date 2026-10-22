export type CheckoutService = 'flight' | 'bus' | 'train';

export const STEPS: Record<CheckoutService, readonly string[]> = {
  flight: ['Flights', 'Travellers', 'Seats', 'Meals', 'Baggage', 'Review', 'Payment', 'Done'],
  bus: ['Bus', 'Seats', 'Travellers', 'Review', 'Payment', 'Done'],
  train: ['Train', 'Passengers', 'Review', 'Payment', 'Done'],
};

/** Index of each shared step, per service (the flight and bus flows differ before review). */
export const CHECKOUT_STEP: Record<
  CheckoutService,
  Record<'travellers' | 'review' | 'payment' | 'done', number>
> = {
  flight: { travellers: 1, review: 5, payment: 6, done: 7 },
  bus: { travellers: 2, review: 3, payment: 4, done: 5 },
  train: { travellers: 1, review: 2, payment: 3, done: 4 },
};

/** Index of the flight add-on steps (seats, meals, baggage). */
export const FLIGHT_ADDON_STEP = { seats: 2, meals: 3, baggage: 4 } as const;

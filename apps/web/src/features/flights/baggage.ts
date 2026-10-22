import type { FlightOffer } from '@zproo/types';

/** "7 Kg Cabin + 15 Kg Checked" for the baggage chosen in the search; null when none chosen. */
export function baggagePreferenceSummary(
  cabinBagKg: number | undefined,
  checkedBagKg: number | undefined,
): string | null {
  const parts: string[] = [];
  if (cabinBagKg !== undefined) parts.push(cabinBagKg === 0 ? 'No Cabin Bag' : `${cabinBagKg} Kg Cabin`);
  if (checkedBagKg !== undefined)
    parts.push(checkedBagKg === 0 ? 'No Checked Bag' : `${checkedBagKg} Kg Checked`);
  return parts.length > 0 ? parts.join(' + ') : null;
}

export const cabinBaggageLabel = (kg: number) => (kg > 0 ? `${kg} Kg` : 'Not included');
export const checkedBaggageLabel = (kg: number) => (kg > 0 ? `${kg} Kg` : 'Not included');

/** The fare's own baggage, exactly as the flight API reports it (per adult). */
export function offerBaggageSummary(offer: Pick<FlightOffer, 'baggage'>): string {
  const { cabinKg, checkInKg } = offer.baggage;
  return `${cabinKg > 0 ? `${cabinKg} Kg Cabin` : 'No Cabin Bag'} + ${
    checkInKg > 0 ? `${checkInKg} Kg Checked` : 'No Checked Bag'
  }`;
}

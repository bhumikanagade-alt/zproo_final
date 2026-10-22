import { receiptText, type ParcelBooking } from './logic';

export const trackingUrl = (id: string) => `${window.location.origin}/parcel/track/${id}`;

/** Copies the public tracking link. Resolves with the message to show the customer. */
export async function copyTrackingLink(id: string): Promise<string> {
  const url = trackingUrl(id);
  try {
    await navigator.clipboard.writeText(url);
    return 'Tracking link copied';
  } catch {
    return url;
  }
}

/** Saves the (sample) receipt as a text file. */
export function downloadReceipt(b: ParcelBooking) {
  const a = document.createElement('a');
  const href = URL.createObjectURL(new Blob([receiptText(b)], { type: 'text/plain' }));
  a.href = href;
  a.download = `${b.id}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

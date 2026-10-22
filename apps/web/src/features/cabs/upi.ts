/** Zproo Go UPI receiver. Change these two values to point payments at a different VPA. */
export const UPI_VPA = 'nakshtra25k@okicici';
export const UPI_PAYEE = 'Zproo Go';

/** Builds a standard UPI deep link (NPCI spec): works in the QR and as a tap-to-pay link on phones. */
export function buildUpiLink({ amount, note }: { amount: number; note: string }) {
  const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, '@');
  return `upi://pay?pa=${enc(UPI_VPA)}&pn=${enc(UPI_PAYEE)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(note.slice(0, 40))}`;
}

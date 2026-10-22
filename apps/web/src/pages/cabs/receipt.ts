import { formatWhen, getVehicle, rupees } from '@/features/cabs/fare';
import type { CabBooking } from '@/features/cabs/types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Printable, self-contained demo receipt (HTML). Not a tax invoice. */
export function receiptHtml(b: CabBooking) {
  const f = b.fare;
  const rows = [['Base fare', f.base], ['Distance charge', f.distance], ['Time charge', f.time], ['Platform fee', f.platform], ['Taxes', f.taxes]]
    .map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${rupees(v as number)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Receipt ${esc(b.reference)}</title>
<body style="font-family:Poppins,Arial,sans-serif;max-width:520px;margin:24px auto;color:#1f1a1b">
<h1 style="color:#e31118">ZPROO GO — Ride receipt (demo)</h1>
<p>Booking reference: <b>${esc(b.reference)}</b><br>Ride: ${esc(getVehicle(b.vehicleId).label)} · ${esc(b.status)}<br>
${esc(b.pickup)} → ${esc(b.drop)}<br>${esc(formatWhen(b.date, b.time))}<br>Payment: ${esc(b.paymentMethod)} (simulated)</p>
<table style="width:100%;border-collapse:collapse">${rows}<tr><td>Discount</td><td style="text-align:right">-${rupees(f.discount)}</td></tr>
<tr><td><b>Total</b></td><td style="text-align:right"><b>${rupees(f.total)}</b></td></tr></table>
<p style="font-size:12px;color:#5f5759">Demo receipt. No real payment was processed and this is not a tax invoice.</p></body></html>`;
}

export function downloadReceipt(b: CabBooking) {
  const url = URL.createObjectURL(new Blob([receiptHtml(b)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `zproo-receipt-${b.reference}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

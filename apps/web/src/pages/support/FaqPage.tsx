import { Card, CardContent } from '@zproo/ui';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Seo } from '@/components/seo/Seo';
const FAQS = [
 ['How do I book a bus?', 'Search your departure and destination, choose a travel date, select a bus and seats, enter traveller details, review the fare and complete payment.'],
 ['Can I choose my seat?', 'Yes. The seat-selection page shows available seats and their prices before you continue.'],
 ['How long is my seat held?', 'The booking timer starts when the booking flow begins and remains visible through checkout. Payment must be completed before the hold expires.'],
 ['Can I cancel my bus ticket?', 'Cancellation depends on the operator policy shown for your selected trip and booking.'],
 ['What should I carry when travelling?', 'Carry your booking reference/ticket and a valid government photo ID. Reach the boarding point early.'],
 ['How are fares calculated?', 'The fare summary shows the applicable base fare, taxes, fees and discounts. Use the “View price breakdown” link to inspect the full breakdown.'],
];
export default function FaqPage() { const [open, setOpen] = useState<number | null>(null); return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14"><Seo title="Bus booking FAQ" description="Frequently asked questions about booking buses with ZPROO GO."/><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h1><p className="mt-3 text-base leading-7 text-muted">Clear answers to common ZPROO BUS booking questions.</p><div className="mt-8 space-y-3">{FAQS.map(([q,a], i) => <Card key={q}><button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={open===i} onClick={() => setOpen(open===i?null:i)}><span className="font-bold">{q}</span><ChevronDown className={`size-5 shrink-0 transition-transform ${open===i?'rotate-180':''}`} /></button>{open===i && <CardContent className="pt-0 text-sm leading-6 text-muted"><p>{a}</p></CardContent>}</Card>)}</div></div> }

/**
 * Static copy for the Bike Booking pages (not API data). Kept out of the components so it can be
 * edited, translated or later moved to a CMS without touching UI code.
 */
import { BadgeCheck, CalendarClock, KeyRound, MapPin, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const BIKE_FEATURES: Feature[] = [
  { icon: Wallet, title: 'Clear pricing', text: 'Hourly and daily rates, deposit and GST shown before you commit.' },
  { icon: ShieldCheck, title: 'Insured & sanitised', text: 'Every bike has insurance, a helmet and roadside assistance.' },
  { icon: MapPin, title: '7 hubs across Pune', text: 'Pick up and drop at stations, the airport and city hubs.' },
];

export const HOW_IT_WORKS: Feature[] = [
  { icon: CalendarClock, title: '1. Pick your dates', text: 'Choose a pickup hub and your rental start and end time.' },
  { icon: BadgeCheck, title: '2. Compare bikes', text: 'Filter by category, price and transmission, then open a bike for full details.' },
  { icon: KeyRound, title: '3. Collect and ride', text: 'Show your licence and ID at the hub, do a quick check and go.' },
];

export interface Faq {
  q: string;
  a: string;
}

export const BIKE_FAQS: Faq[] = [
  { q: 'What documents do I need?', a: 'A valid two-wheeler driving licence (original) and a government photo ID. Riders must be at least 18 years old.' },
  { q: 'Is fuel included?', a: 'Petrol bikes are handed over with fuel as noted on the handover sheet and should be returned with the same level. Electric bikes can be charged free at any ZPROO GO hub.' },
  { q: 'What is the security deposit?', a: 'A refundable amount held at pickup and returned within 3 working days after the bike is checked on return. It is shown on every bike page.' },
  { q: 'Can I return the bike at a different hub?', a: 'Yes. A flat one-way fee applies, shown in the price estimate when you choose different pickup and return hubs.' },
  { q: 'What happens if I return late?', a: 'Extra hours are charged at the hourly rate, capped at one extra day. Contact the hub if you need to extend.' },
  { q: 'Can I cancel?', a: 'Free cancellation up to 6 hours before pickup (demo policy; final rules are pending business sign-off).' },
];

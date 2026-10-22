import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zproo/ui';
import { ArrowRight, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { CountryCodeSelect, Flag } from '@/features/hotels/components/CountryCodeSelect';
import { HotelSteps } from '@/features/hotels/components/HotelSteps';
import { PriceBox } from '@/features/hotels/components/PriceBox';
import { nightsBetween } from '@/features/hotels/data';
import { hotelReviewUrl } from '@/features/hotels/links';
import { guestsLabel } from '@/features/hotels/occupancy';
import { couponSelection, priceStay } from '@/features/hotels/pricing';
import { useHotelBooking, type HotelGuest } from '@/features/hotels/store';
import {
  DEFAULT_COUNTRY_ISO,
  PHONE_COUNTRIES,
  SPECIAL_REQUESTS,
  SPECIAL_REQUEST_DISCLAIMER,
  SPECIAL_REQUEST_NOTE_MAX,
  formatInternationalPhone,
  normalisePhone,
  phoneCountry,
  phoneCountryByName,
  sanitizeName,
  HOTEL_FIRST_NAME_MAX,
  HOTEL_LAST_NAME_MAX,
  validateContact,
  validateGuests,
  validateSpecialRequests,
  type ContactErrors,
  type GuestErrors,
} from '@/features/hotels/validation';

const Err = ({ id, text }: { id: string; text?: string | undefined }) =>
  text ? <p id={id} role="alert" className="mt-1 text-xs font-semibold text-danger">{text}</p> : null;

export default function HotelBookingPage() {
  const navigate = useNavigate();
  const s = useHotelBooking();
  const { hotel, room, adults, children, childAges, guests, contact, setGuests, setSpecialRequests } = s;
  const [rows, setRows] = useState<HotelGuest[]>(() =>
    guests.length
      ? guests
      : [
          ...Array.from({ length: adults }, () => ({ firstName: '', lastName: '', age: 30, type: 'ADULT' as const, gender: 'MALE' })),
          ...Array.from({ length: children }, (_, i) => ({ firstName: '', lastName: '', age: childAges[i] ?? 8, type: 'CHILD' as const, gender: 'MALE' })),
        ],
  );
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(() =>
    normalisePhone(contact?.phone ?? '', phoneCountryByName(contact?.country ?? '')?.iso ?? DEFAULT_COUNTRY_ISO),
  );
  const [name, setName] = useState(contact?.name ?? '');
  const [countryIso, setCountryIso] = useState(
    () => phoneCountryByName(contact?.country ?? '')?.iso ?? DEFAULT_COUNTRY_ISO,
  );
  const country = phoneCountry(countryIso).name;
  const [requests, setRequests] = useState<string[]>(s.specialRequests);
  const [note, setNote] = useState(s.specialNote);
  const [guestErrors, setGuestErrors] = useState<Record<number, GuestErrors>>({});
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [noteError, setNoteError] = useState<string | null>(null);
  const [general, setGeneral] = useState('');
  if (!hotel || !room) return <Navigate to="/hotels" replace />;

  const nights = nightsBetween(s.checkIn, s.checkOut);
  const price = priceStay(room, nights, s.rooms, couponSelection(s.coupon, s.couponDiscountPaise));
  const update = (index: number, key: keyof HotelGuest, value: string) =>
    setRows((cur) => cur.map((g, i) => (i === index ? { ...g, [key]: key === 'age' ? (value === '' ? Number.NaN : Number(value)) : key === 'firstName' ? sanitizeName(value, HOTEL_FIRST_NAME_MAX) : key === 'lastName' ? sanitizeName(value, HOTEL_LAST_NAME_MAX) : value } : g)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const g = validateGuests(rows, { adults, children });
    const c = validateContact({ name, email, phone, country });
    const n = validateSpecialRequests(note);
    setGuestErrors(g.byIndex);
    setContactErrors(c);
    setNoteError(n);
    const firstError = g.general ?? (Object.keys(g.byIndex).length ? 'Please fix the highlighted guest details.' : Object.keys(c).length ? 'Please fix the contact details.' : n);
    setGeneral(firstError ?? '');
    if (firstError) return;
    setGuests(rows.map((r) => ({ ...r, firstName: r.firstName.trim(), lastName: r.lastName.trim() })), { email: email.trim(), phone: formatInternationalPhone(phone, countryIso), name: name.trim(), country });
    setSpecialRequests(requests, note.trim());
    void navigate(hotelReviewUrl);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Seo title="Guest details" noIndex />
      <HotelSteps current={1} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-primary">{hotel.name} · {room.name}</p>
            <h1 className="text-3xl font-extrabold">Guest details</h1>
            <p className="mt-1 text-sm text-muted">Names should match the ID of the guests who will check in.</p>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Guests</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {rows.map((g, i) => {
                const er = guestErrors[i] ?? {};
                return (
                  <div key={i} className="rounded-2xl border border-border p-4">
                    <p className="mb-3 flex items-center gap-2 font-bold"><UserRound aria-hidden className="size-4" /> Guest {i + 1} · {g.type === 'ADULT' ? 'Adult' : 'Child'}</p>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div><Label htmlFor={`first-${i}`}>First name</Label><Input id={`first-${i}`} maxLength={HOTEL_FIRST_NAME_MAX} value={g.firstName} aria-invalid={er.firstName ? true : undefined} aria-describedby={er.firstName ? `first-${i}-err` : undefined} onChange={(e) => update(i, 'firstName', e.target.value)} className="mt-1" /><Err id={`first-${i}-err`} text={er.firstName} /></div>
                      <div><Label htmlFor={`last-${i}`}>Last name</Label><Input id={`last-${i}`} maxLength={HOTEL_LAST_NAME_MAX} value={g.lastName} aria-invalid={er.lastName ? true : undefined} aria-describedby={er.lastName ? `last-${i}-err` : undefined} onChange={(e) => update(i, 'lastName', e.target.value)} className="mt-1" /><Err id={`last-${i}-err`} text={er.lastName} /></div>
                      <div><Label htmlFor={`gender-${i}`}>Gender (optional)</Label>
                        <select id={`gender-${i}`} value={g.gender ?? ''} onChange={(e) => update(i, 'gender', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
                          <option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                        </select></div>
                      <div><Label htmlFor={`age-${i}`}>Age</Label><Input id={`age-${i}`} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={Number.isNaN(g.age) ? '' : g.age} aria-invalid={er.age ? true : undefined} aria-describedby={er.age ? `age-${i}-err` : undefined} onChange={(e) => update(i, 'age', e.target.value.replace(/\D/g, '').slice(0, 3))} className="mt-1" /><Err id={`age-${i}-err`} text={er.age} /></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">Contact details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="hotel-name">Full name</Label><Input id="hotel-name" value={name} aria-invalid={contactErrors.name ? true : undefined} onChange={(e) => setName(sanitizeName(e.target.value))} className="mt-1" autoComplete="name" /><Err id="hotel-name-err" text={contactErrors.name} /></div>
              <div><Label htmlFor="hotel-email">Email</Label><div className="relative mt-1"><Mail aria-hidden className="absolute left-3 top-3 size-4 text-muted" /><Input id="hotel-email" type="email" value={email} aria-invalid={contactErrors.email ? true : undefined} onChange={(e) => setEmail(e.target.value)} className="pl-9" autoComplete="email" /></div><Err id="hotel-email-err" text={contactErrors.email} /></div>
              <div><Label htmlFor="hotel-phone">Mobile number</Label><div className="mt-1 flex gap-2"><CountryCodeSelect value={countryIso} invalid={contactErrors.phone ? true : undefined} onChange={(iso) => { setCountryIso(iso); setPhone((cur) => normalisePhone(cur, iso)); }} /><Input id="hotel-phone" type="tel" value={phone} inputMode="numeric" pattern="[0-9]*" aria-invalid={contactErrors.phone ? true : undefined} aria-describedby={contactErrors.phone ? 'hotel-phone-err' : undefined} onChange={(e) => setPhone(normalisePhone(e.target.value, countryIso))} onKeyDown={(e) => { if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} className="min-w-0 flex-1" placeholder={phoneCountry(countryIso).example} autoComplete="tel-national" /></div><Err id="hotel-phone-err" text={contactErrors.phone} /></div>
              <div><Label htmlFor="hotel-country">Country</Label>
                <div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"><Flag iso={countryIso} /></span><select id="hotel-country" value={countryIso} onChange={(e) => { setCountryIso(e.target.value); setPhone((cur) => normalisePhone(cur, e.target.value)); }} className="h-11 w-full rounded-xl border border-border bg-card pl-11 pr-2 text-sm">{PHONE_COUNTRIES.map((c) => <option key={c.iso} value={c.iso}>{c.name}</option>)}</select></div>
                <Err id="hotel-country-err" text={contactErrors.country} /></div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">Special requests <span className="text-xs font-normal text-muted">(optional)</span></CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {SPECIAL_REQUESTS.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={requests.includes(r.id)} onChange={() => setRequests((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))} className="size-4 accent-[var(--primary)]" /> {r.label}
                  </label>
                ))}
              </div>
              <Label htmlFor="special-note" className="mt-4 block">Other request</Label>
              <textarea id="special-note" value={note} maxLength={SPECIAL_REQUEST_NOTE_MAX + 50} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" placeholder="Anything else the hotel should know?" />
              <div className="flex justify-between"><Err id="note-err" text={noteError ?? undefined} /><span className="ml-auto text-xs text-muted">{note.length}/{SPECIAL_REQUEST_NOTE_MAX}</span></div>
              <p className="mt-2 text-xs text-muted">{SPECIAL_REQUEST_DISCLAIMER}</p>
            </CardContent>
          </Card>
          {general && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{general}</p>}
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div><p className="text-xs text-muted">Your room</p><p className="mt-1 font-extrabold">{room.name}</p><p className="text-sm text-muted">{hotel.name}</p>
            <p className="mt-2 text-sm text-muted">{nights} night{nights === 1 ? '' : 's'} · {s.rooms} room{s.rooms === 1 ? '' : 's'} · {guestsLabel(adults, children)}</p></div>
          <PriceBox price={price} payAtProperty={room.payAtProperty} />
          <Button type="submit" size="lg" className="w-full">Review booking <ArrowRight aria-hidden /></Button>
        </aside>
      </form>
    </div>
  );
}

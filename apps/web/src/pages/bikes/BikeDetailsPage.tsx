import { Badge, Button, Skeleton } from '@zproo/ui';
import { Check, Cog, FileCheck2, Fuel, ShieldCheck, Star, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeGallery } from '@/features/bikes/components/BikeGallery';
import { FaqList } from '@/features/bikes/components/FaqList';
import { PriceBreakdown } from '@/features/bikes/components/PriceBreakdown';
import { ReviewsSection } from '@/features/bikes/components/ReviewsSection';
import { ScheduleFields } from '@/features/bikes/components/ScheduleFields';
import { SimilarBikes } from '@/features/bikes/components/SimilarBikes';
import { AvailabilityBadge, Card, DemoNote, ErrorState, SectionTitle } from '@/features/bikes/components/ui';
import { BIKE_FAQS } from '@/features/bikes/content';
import { useBike, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { computeQuote, rupees } from '@/features/bikes/pricing';
import { CATEGORY_META, RULES, REQUIRED_DOCUMENTS } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';
import { BikeApiError } from '@/features/bikes/types';
import { validateSchedule } from '@/features/bikes/validation';

export default function BikeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const bikeQuery = useBike(id);
  const locationsQuery = useLocations();
  const { schedule, patchSchedule, ensureFreshSchedule } = useBikeStore();
  const [errors, setErrors] = useState<ReturnType<typeof validateSchedule>>({});
  const bike = bikeQuery.data;
  const locations = locationsQuery.data ?? [];

  useEffect(() => {
    ensureFreshSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The pickup area is picked on the next step. Drop one left over from another bike that this bike does not stock.
  useEffect(() => {
    if (!bike || !schedule.pickupLocationId) return;
    if (!bike.availability.locationIds.includes(schedule.pickupLocationId)) {
      patchSchedule({ pickupLocationId: '', returnLocationId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bike?.id]);

  const quote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras: [] }) : null), [bike, schedule]);
  // Areas in the chosen city where this bike can be collected (the rider picks one on the next step).
  const cityAreas = locations.filter((l) => l.city === schedule.pickupCity && bike?.availability.locationIds.includes(l.id));

  if (bikeQuery.isPending) return <DetailsSkeleton />;
  if (bikeQuery.isError || !bike) {
    const notFound = bikeQuery.error instanceof BikeApiError && bikeQuery.error.code === 'NOT_FOUND';
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <Seo title="Bike not found" noIndex />
        <ErrorState
          title={notFound ? 'Bike not found' : "We couldn't load this bike"}
          message={bikeQuery.error instanceof Error ? bikeQuery.error.message : 'Please try again.'}
          {...(notFound ? {} : { onRetry: () => void bikeQuery.refetch() })}
          backTo={{ to: bikeLinks.results(), label: 'Browse all bikes' }}
        />
      </div>
    );
  }

  const unavailable = bike.availability.status === 'unavailable';
  const FuelIcon = bike.fuelType === 'electric' ? Zap : Fuel;
  const specs: [string, string][] = [
    ['Engine / motor', bike.specs.engine],
    ['Power', bike.specs.power],
    [bike.fuelType === 'electric' ? 'Range' : 'Mileage', bike.specs.efficiency],
    ['Top speed', bike.specs.topSpeed],
    [bike.fuelType === 'electric' ? 'Battery' : 'Fuel tank', bike.specs.fuelCapacity],
    ['Kerb weight', bike.specs.weight],
    ['Seat height', bike.specs.seatHeight],
    ['Brakes', bike.specs.brakes],
    ['Seats', String(bike.specs.seats)],
    ['Transmission', bike.transmission === 'manual' ? 'Manual' : 'Automatic'],
  ];

  const bookNow = () => {
    const errs = validateSchedule(schedule, bike.pricing.minHours, new Date(), { cityOnly: true });
    setErrors(errs);
    if (Object.keys(errs).length) {
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    void navigate({ pathname: bikeLinks.book(bike.id), search });
  };

  return (
    <div className="bg-background pb-24 lg:pb-16">
      <Seo title={`${bike.name} rental`} description={`Rent the ${bike.name} from ${rupees(bike.pricing.daily)} per day.`} />
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
          <Link to={bikeLinks.results()} className="hover:text-foreground">Results</Link> <span aria-hidden>/</span>{' '}
          <span aria-current="page" className="text-foreground">{bike.name}</span>
        </nav>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-8">
            <BikeGallery images={bike.images} />

            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{CATEGORY_META[bike.category].label}</Badge>
                <Badge variant="outline"><Cog aria-hidden className="size-3" />{bike.transmission === 'manual' ? 'Manual' : 'Automatic'}</Badge>
                <Badge variant="outline"><FuelIcon aria-hidden className="size-3" />{bike.fuelType === 'electric' ? 'Electric' : 'Petrol'}</Badge>
                <AvailabilityBadge status={bike.availability.status} unitsLeft={bike.availability.unitsLeft} />
              </div>
              <h1 className="mt-3 text-[28px] font-bold leading-9">{bike.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                <span>Model {bike.model} · {bike.year}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star aria-hidden className="size-4 fill-warning text-warning" />{bike.rating.toFixed(1)}
                  <span className="font-normal text-muted">({bike.reviewCount.toLocaleString('en-IN')} reviews)</span>
                </span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed">{bike.description}</p>
            </header>

            <section aria-labelledby="specs-h">
              <SectionTitle id="specs-h">Specifications</SectionTitle>
              <Card className="p-0 sm:p-0">
                <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
                  {specs.map(([k, v], i) => (
                    <div key={k} className={`flex justify-between gap-4 px-4 py-3 text-sm sm:px-6 ${i >= 2 ? 'sm:border-t sm:border-border' : ''}`}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <ul className="mt-4 flex flex-wrap gap-2">
                {bike.features.map((f) => (
                  <li key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm"><Check aria-hidden className="size-3.5 text-success" />{f}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="charges-h">
              <SectionTitle id="charges-h">Rental charges &amp; duration</SectionTitle>
              <Card>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Rate label="Per hour" value={rupees(bike.pricing.hourly)} note={`Minimum ${bike.pricing.minHours} hours`} />
                  <Rate label="Per day (24 hrs)" value={rupees(bike.pricing.daily)} note={`${bike.pricing.kmPerDay} km included`} />
                  <Rate label="Extra distance" value={`${rupees(bike.pricing.extraKmCharge)}/km`} note="Beyond the daily allowance" />
                </dl>
                <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted">
                  {RULES.discounts.map((d) => <li key={d.label}>• {d.label} for rentals of {d.minHours / 24}+ days</li>)}
                  <li>• Hours beyond a full day are charged hourly, never more than one extra day.</li>
                  <li>• Maximum rental: {RULES.maxDays} days. GST ({RULES.taxRate * 100}%) is added to the total.</li>
                </ul>
              </Card>
            </section>

            <section aria-labelledby="policy-h" className="grid gap-4 md:grid-cols-2">
              <h2 id="policy-h" className="sr-only">Fuel policy, deposit and inclusions</h2>
              <Card>
                <h3 className="flex items-center gap-2 font-bold"><FuelIcon aria-hidden className="size-4 text-primary" />{bike.fuelType === 'electric' ? 'Charging policy' : 'Fuel policy'}</h3>
                <p className="mt-2 text-sm text-muted">{bike.fuelPolicy}</p>
                <h3 className="mt-5 flex items-center gap-2 font-bold"><ShieldCheck aria-hidden className="size-4 text-primary" />Security deposit</h3>
                <p className="mt-2 text-sm text-muted"><strong className="text-foreground">{rupees(bike.securityDeposit)}</strong>, refundable. Collected at pickup and returned within 3 working days after the bike is checked on return.</p>
              </Card>
              <Card>
                <h3 className="font-bold">Included services</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {bike.includedServices.map((s) => <li key={s} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />{s}</li>)}
                  <li className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />{bike.pricing.kmPerDay} km per rental day</li>
                </ul>
              </Card>
            </section>

            <section aria-labelledby="loc-h">
              <SectionTitle id="loc-h">Pickup &amp; return areas</SectionTitle>
              <Card className="space-y-3 text-sm">
                {!schedule.pickupCity ? (
                  <p className="text-muted">Choose a pickup city in the booking panel to see where this bike can be collected.</p>
                ) : cityAreas.length === 0 ? (
                  <p role="status" className="text-muted">This bike is not stocked in <strong className="text-foreground">{schedule.pickupCity}</strong>. Choose another city in the booking panel.</p>
                ) : (
                  <>
                    <p className="text-muted">Available in <strong className="text-foreground">{schedule.pickupCity}</strong> at:</p>
                    <ul className="flex flex-wrap gap-2">
                      {cityAreas.map((l) => <li key={l.id} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">{l.area}</li>)}
                    </ul>
                    <p className="text-xs text-muted">You will choose your exact pickup area on the next step.</p>
                  </>
                )}
              </Card>
            </section>

            <section aria-labelledby="docs-h">
              <SectionTitle id="docs-h">Documents to carry</SectionTitle>
              <Card>
                <ul className="space-y-2 text-sm">
                  {REQUIRED_DOCUMENTS.map((d) => <li key={d} className="flex gap-2"><FileCheck2 aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />{d}</li>)}
                </ul>
                <p className="mt-3 text-sm text-muted">Riders must be {RULES.minRiderAge}+ with a valid licence. {RULES.cancellation}</p>
              </Card>
            </section>

            <ReviewsSection bike={bike} />

            <section aria-labelledby="faq-h">
              <SectionTitle id="faq-h">Rental FAQs</SectionTitle>
              <FaqList items={BIKE_FAQS} />
            </section>
          </div>

          <aside aria-label="Book this bike" className="mt-8 lg:sticky lg:top-24 lg:mt-0">
            <Card className="space-y-4 shadow-lg">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold leading-7">{rupees(bike.pricing.daily)}<span className="text-sm font-medium text-muted"> /day</span></p>
                <p className="text-sm text-muted">{rupees(bike.pricing.hourly)}/hr</p>
              </div>
              <ScheduleFields layout="stack" schedule={schedule} locations={locations} onChange={patchSchedule} errors={errors} />
              {quote ? (
                <PriceBreakdown quote={quote} />
              ) : (
                <p role="status" className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-muted">Choose valid pickup and return times to see your estimated charges.</p>
              )}
              {unavailable ? (
                <>
                  <Button size="lg" className="w-full" disabled>Currently unavailable</Button>
                  <p className="text-center text-sm text-muted">This bike is not available right now. <Link to={bikeLinks.results()} className="font-semibold text-primary hover:underline">See other bikes</Link></p>
                </>
              ) : (
                <Button size="lg" className="w-full" onClick={bookNow}>Book Now</Button>
              )}
              <DemoNote />
            </Card>
          </aside>
        </div>

        <div className="mt-12">
          <SimilarBikes bike={bike} />
        </div>
      </div>

      {/* Mobile: keep the call to action reachable while scrolling the long page. */}
      {!unavailable && (
        <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-30 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-muted">{quote ? 'Estimated total' : 'From'}</p>
            <p className="text-lg font-bold leading-5">{quote ? rupees(quote.total) : `${rupees(bike.pricing.daily)}/day`}</p>
          </div>
          <Button onClick={bookNow}>Book Now</Button>
        </div>
      )}
    </div>
  );
}

function Rate({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-neutral-100 p-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-bold">{value}</dd>
      <dd className="text-xs text-muted">{note}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading bike details" className="mx-auto max-w-[1200px] px-4 py-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="aspect-[3/2] w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="mt-6 h-96 w-full lg:mt-0" />
      </div>
    </div>
  );
}

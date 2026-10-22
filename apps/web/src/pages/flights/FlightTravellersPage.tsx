import { zodResolver } from '@hookform/resolvers/zod';
import type { FlightOffer, PaxCounts } from '@zproo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton } from '@zproo/ui';
import { flightPriceBreakdown } from '@zproo/utils';
import {
  COUNTRIES,
  flightContactFormSchema,
  internationalDocumentIssues,
  isDobRequired,
  isInternationalItinerary,
  passengerAgeIssues,
  passengerSchema,
  splitPhone,
  addMonthsIso,
  MIN_BIRTH_DATE,
  VISA_TYPES,
  VISA_TYPE_LABEL,
  VISA_ENTRY_TYPES,
  VISA_ENTRY_TYPE_LABEL,
  ID_TYPES,
  ID_TYPE_LABEL,
  ID_INPUT_RULES,
  sanitizeIdNumber,
  documentVerification,
  FLIGHT_FIRST_NAME_MAX,
  FLIGHT_LAST_NAME_MAX,
  overallDocumentStatus,
  type DocumentCheckPassenger,
  type IdentityDocumentInput,
  type IdType,
  type PassengerInput,
  type TravelDocumentInput,
} from '@zproo/validation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { CountryPhoneInput } from '@/features/auth/components/CountryPhoneInput';
import { errorMessage } from '@/features/auth/errors';
import { useAuthStore } from '@/features/auth/store';
import { useItineraryOffers } from '@/features/flights/api';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import {
  AdditionalDocumentsChecklist,
  DocumentVerificationPanel,
} from '@/features/flights/components/DocumentVerification';
import { DateInput } from '@/features/flights/components/DateInput';
import { ItinerarySummary } from '@/features/flights/components/ItinerarySummary';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { useFlightDraft, type Itinerary } from '@/features/flights/draft';
import { departureDate, travelDate as formatDate } from '@/features/flights/format';

const formSchema = z.object({
  passengers: z.array(passengerSchema),
  contact: flightContactFormSchema,
});
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const TYPE_LABEL = { ADULT: 'Adult', CHILD: 'Child', INFANT: 'Infant' } as const;
const TITLE_OPTIONS = {
  ADULT: [
    ['MR', 'Mr'],
    ['MRS', 'Mrs'],
    ['MS', 'Ms'],
  ],
  CHILD: [
    ['MSTR', 'Master'],
    ['MISS', 'Miss'],
  ],
  INFANT: [
    ['MSTR', 'Master'],
    ['MISS', 'Miss'],
  ],
} as const;

const blankDocument = (): TravelDocumentInput => ({
  nationality: 'IN',
  passportNumber: '',
  passportIssuingCountry: 'IN',
  passportExpiry: '',
  visaType: 'TOURIST',
  visaNumber: '',
  visaExpiry: '',
});

const ID_HINT: Record<IdentityDocumentInput['type'], string> = {
  AADHAAR: 'Exactly 12 digits (numbers only), for example 234567890124',
  PASSPORT: 'As printed on the passport, up to 9 letters or digits (Indian passports: one letter and 7 digits)',
  VOTER_ID: '10 characters: 3 letters followed by 7 digits, for example ABC1234567',
  DRIVING_LICENCE: 'Up to 16 letters or digits, starting with the state code, for example MH1220110012345',
  PAN: '10 characters: 5 letters, 4 digits, 1 letter, for example ABCPE1234F',
  OTHER: '4–20 letters or digits',
};

const blankIdentity = (): IdentityDocumentInput => ({
  type: 'AADHAAR',
  number: '',
  nationality: 'IN',
});

function blankPassengers(pax: PaxCounts): PassengerInput[] {
  const make = (type: PassengerInput['type'], n: number) =>
    Array.from({ length: n }, () => ({
      type,
      title: type === 'ADULT' ? 'MR' : 'MSTR',
      firstName: '',
      lastName: '',
      gender: 'MALE',
    })) as PassengerInput[];
  return [
    ...make('ADULT', pax.adults),
    ...make('CHILD', pax.children),
    ...make('INFANT', pax.infants),
  ];
}

export default function FlightTravellersPage() {
  const itinerary = useFlightDraft((s) => s.itinerary);
  if (!itinerary) return <NothingSelected />;
  return <Travellers itinerary={itinerary} />;
}

function Travellers({ itinerary }: { itinerary: Itinerary }) {
  const { offers, isPending, error } = useItineraryOffers(itinerary.offerIds, itinerary.pax);
  const back = { to: itinerary.searchUrl, label: 'Change flight' };
  return (
    <CheckoutShell
      step={1}
      title="Traveller details"
      back={back}
      aside={
        offers ? (
          <>
            <PriceSummary price={flightPriceBreakdown(offers, itinerary.pax)} />
            <ItinerarySummary offers={offers} />
          </>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      {error ? (
        <FormAlert>{errorMessage(error)} Please choose another flight.</FormAlert>
      ) : isPending || !offers ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <TravellerForm itinerary={itinerary} offers={offers} />
      )}
    </CheckoutShell>
  );
}

function TravellerForm({ itinerary, offers }: { itinerary: Itinerary; offers: FlightOffer[] }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const draft = useFlightDraft();
  const saved = draft.passengers;
  const expected = blankPassengers(itinerary.pax);
  const sameMix =
    saved?.length === expected.length && saved.every((p, i) => p.type === expected[i]?.type);
  // The passenger mix is fixed by the search, so the list of forms never changes.
  const passengers = sameMix && saved ? saved : expected;
  const travelDate = departureDate(offers[0] as FlightOffer);
  const lastOffer = offers[offers.length - 1] as FlightOffer;
  const lastTravelDate = departureDate(lastOffer);
  const international = isInternationalItinerary(offers);
  const [visaDeclared, setVisaDeclared] = useState(false);
  const [declarationError, setDeclarationError] = useState<string | null>(null);
  const [idDeclared, setIdDeclared] = useState(false);
  const [idDeclarationError, setIdDeclarationError] = useState<string | null>(null);
  const phone = splitPhone(draft.contact?.phone ?? user?.phone);

  // Passport/visa fields exist only on international flights; domestic bookings never carry them.
  const startPassengers = passengers.map((p) =>
    international
      ? { ...p, travelDocument: p.travelDocument ?? blankDocument(), identityDocument: undefined }
      : { ...p, travelDocument: undefined, identityDocument: p.identityDocument ?? blankIdentity() },
  );

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengers: startPassengers,
      contact: {
        email: draft.contact?.email ?? user?.email ?? '',
        countryCode: phone.countryCode,
        phone: phone.national,
      },
    },
    mode: 'onTouched',
  });
  const { register, handleSubmit, formState, setError, watch, setValue, getValues, trigger } = form;
  // Switching ID type (or nationality) keeps only what the new ID type accepts, e.g. no letters in an Aadhaar number.
  const refitIdNumber = (index: number, type: string) => {
    const current = getValues(`passengers.${index}.identityDocument.number`) ?? '';
    setValue(`passengers.${index}.identityDocument.number`, sanitizeIdNumber(type as IdType, current));
  };
  const countryCode = watch('contact.countryCode');
  const typed = watch('passengers');
  // Live Pending / Verified / Action required status for each traveller.
  const checks = documentVerification((typed ?? []) as unknown as DocumentCheckPassenger[], {
    international,
    travelDate,
    lastTravelDate,
  });

  const onSubmit = handleSubmit((values) => {
    const issues = passengerAgeIssues(values.passengers, travelDate);
    if (issues.length > 0) {
      for (const issue of issues)
        setError(`passengers.${issue.index}.dateOfBirth`, { message: issue.message });
      return;
    }
    // Document verification: ID (domestic) or passport/visa dates (international).
    const documentProblems = documentVerification(values.passengers as DocumentCheckPassenger[], {
      international,
      travelDate,
      lastTravelDate,
    });
    let blocked = false;
    documentProblems.forEach((check, index) => {
      for (const issue of [...check.issues, ...check.missing]) {
        setError(`passengers.${index}.${issue.field}` as `passengers.${number}.dateOfBirth`, {
          message: issue.message,
        });
        blocked = true;
      }
    });
    if (blocked) return;
    if (international) {
      const docIssues = internationalDocumentIssues(values.passengers, travelDate, lastTravelDate);
      for (const issue of docIssues) {
        setError(`passengers.${issue.index}.${issue.field}` as `passengers.${number}.dateOfBirth`, {
          message: issue.message,
        });
      }
      if (!visaDeclared) {
        setDeclarationError('Please confirm that every traveller holds a valid visa');
        return;
      }
      if (docIssues.length > 0) return;
    }
    setDeclarationError(null);
    if (!international) {
      if (!idDeclared) {
        setIdDeclarationError('Please confirm the details match the original ID');
        return;
      }
      setIdDeclarationError(null);
    }
    draft.setTravellers(values.passengers, values.contact);
    void navigate('/flights/seats');
  });

  const errors = formState.errors as FieldErrors<FormOutput>;
  const numbers = passengers.map(
    (p, i) => passengers.slice(0, i + 1).filter((q) => q.type === p.type).length,
  );
  const travellerLabels = passengers.map((p, i) => `${TYPE_LABEL[p.type]} ${numbers[i]}`);
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="text-sm text-muted">
        Enter names exactly as on the government ID each traveller will carry. Travel date:{' '}
        {formatDate(travelDate)}.
      </p>
      {international && (
        <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary-light p-4 text-sm">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            <strong>International flight — passport and visa required.</strong> Every traveller
            needs a passport valid for at least 6 months after the last flight
            ({formatDate(addMonthsIso(lastTravelDate, 6))} or later) and a visa valid for the
            destination. Enter the details exactly as printed on the documents.
          </p>
        </div>
      )}
      <DocumentVerificationPanel
        international={international}
        checks={checks}
        labels={travellerLabels}
        overall={overallDocumentStatus(checks)}
      />
      {passengers.map((p, i) => {
        const e = errors.passengers?.[i];
        const idNationality = watch(`passengers.${i}.identityDocument.nationality`) ?? 'IN';
        const idType = watch(`passengers.${i}.identityDocument.type`) ?? 'AADHAAR';
        const dobRequired = isDobRequired(p.type, international);
        return (
          <Card key={i}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {TYPE_LABEL[p.type]} {numbers[i]}
                <span className="ml-2 text-sm font-normal text-muted">
                  {p.type === 'ADULT'
                    ? '12+ years'
                    : p.type === 'CHILD'
                      ? '2–11 years'
                      : 'Under 2 years'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title" error={e?.title?.message}>
                <Select {...register(`passengers.${i}.title`)}>
                  {TITLE_OPTIONS[p.type].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Gender" error={e?.gender?.message}>
                <Select
                  {...register(`passengers.${i}.gender`, {
                    // Keep the title in step with the gender so they never disagree.
                    onChange: (event: { target: { value: string } }) => {
                      const title = getValues(`passengers.${i}.title`);
                      const gender = event.target.value;
                      const adult = p.type === 'ADULT';
                      if (gender === 'FEMALE' && (title === 'MR' || title === 'MSTR')) {
                        setValue(`passengers.${i}.title`, adult ? 'MS' : 'MISS');
                      } else if (gender === 'MALE' && ['MRS', 'MS', 'MISS'].includes(title)) {
                        setValue(`passengers.${i}.title`, adult ? 'MR' : 'MSTR');
                      }
                    },
                  })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
              <FormField label="First & middle name" error={e?.firstName?.message}>
                <Input
                  autoComplete={i === 0 ? 'given-name' : 'off'}
                  maxLength={FLIGHT_FIRST_NAME_MAX}
                  {...register(`passengers.${i}.firstName`)}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/[^A-Za-z ]/g, '');
                  }}
                />
              </FormField>
              <FormField label="Last name" error={e?.lastName?.message}>
                <Input
                  autoComplete={i === 0 ? 'family-name' : 'off'}
                  maxLength={FLIGHT_LAST_NAME_MAX}
                  {...register(`passengers.${i}.lastName`)}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/[^A-Za-z ]/g, '');
                  }}
                />
              </FormField>
              <FormField
                label={dobRequired ? 'Date of birth' : 'Date of birth (optional)'}
                error={e?.dateOfBirth?.message}
                hint={
                  !dobRequired
                    ? 'You can skip this for adults on domestic flights.'
                    : p.type === 'ADULT'
                      ? 'Required for international travel (matches the passport).'
                      : 'Required for children and infants to confirm the fare.'
                }
              >
                <DateInput
                  control={form.control}
                  name={`passengers.${i}.dateOfBirth`}
                  autoComplete="bday"
                  min={MIN_BIRTH_DATE}
                  max={travelDate}
                />
              </FormField>
              {!international && (
                <>
                  <FormField label="Nationality" error={e?.identityDocument?.nationality?.message}>
                    <Select
                      {...register(`passengers.${i}.identityDocument.nationality`, {
                        onChange: (event: { target: { value: string } }) => {
                          // Foreign nationals can only use a passport on domestic flights.
                          if (event.target.value !== 'IN') {
                            setValue(`passengers.${i}.identityDocument.type`, 'PASSPORT');
                            refitIdNumber(i, 'PASSPORT');
                          }
                        },
                      })}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="ID type" error={e?.identityDocument?.type?.message}>
                    <Select
                      {...register(`passengers.${i}.identityDocument.type`, {
                        onChange: (event: { target: { value: string } }) =>
                          refitIdNumber(i, event.target.value),
                      })}
                    >
                      {ID_TYPES.filter((t) => t !== 'OTHER' && (idNationality === 'IN' || t === 'PASSPORT')).map((t) => (
                        <option key={t} value={t}>
                          {ID_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label={p.type === 'ADULT' ? 'ID number' : 'ID number (optional)'}
                    error={e?.identityDocument?.number?.message}
                    hint={ID_HINT[idType]}
                  >
                    <Input
                      autoComplete="off"
                      // A little room for spaces in a pasted number; the cleaner trims it to the real length.
                      maxLength={ID_INPUT_RULES[idType as IdType].maxLength + 4}
                      inputMode={ID_INPUT_RULES[idType as IdType].inputMode}
                      {...register(`passengers.${i}.identityDocument.number`)}
                      onInput={(event) => {
                        event.currentTarget.value = sanitizeIdNumber(
                          idType as IdType,
                          event.currentTarget.value,
                        );
                      }}
                    />
                  </FormField>
                </>
              )}
              {international && (
                <>
                  <FormField label="Nationality" error={e?.travelDocument?.nationality?.message}>
                    <Select {...register(`passengers.${i}.travelDocument.nationality`)}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Passport number" error={e?.travelDocument?.passportNumber?.message}>
                    <Input
                      autoComplete="off"
                      maxLength={9}
                      {...register(`passengers.${i}.travelDocument.passportNumber`)}
                      onInput={(event) => {
                        event.currentTarget.value = event.currentTarget.value
                          .replace(/[^A-Za-z0-9]/g, '')
                          .toUpperCase();
                      }}
                    />
                  </FormField>
                  <FormField
                    label="Passport issuing country"
                    error={e?.travelDocument?.passportIssuingCountry?.message}
                  >
                    <Select {...register(`passengers.${i}.travelDocument.passportIssuingCountry`)}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Passport expiry date"
                    error={e?.travelDocument?.passportExpiry?.message}
                  >
                    <DateInput
                      control={form.control}
                      name={`passengers.${i}.travelDocument.passportExpiry`}
                      min={addMonthsIso(lastTravelDate, 6)}
                      blank=""
                    />
                  </FormField>
                  <FormField label="Visa type" error={e?.travelDocument?.visaType?.message}>
                    <Select {...register(`passengers.${i}.travelDocument.visaType`)}>
                      {VISA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {VISA_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Visa number" error={e?.travelDocument?.visaNumber?.message}>
                    <Input
                      autoComplete="off"
                      maxLength={15}
                      {...register(`passengers.${i}.travelDocument.visaNumber`)}
                      onInput={(event) => {
                        event.currentTarget.value = event.currentTarget.value
                          .replace(/[^A-Za-z0-9]/g, '')
                          .toUpperCase();
                      }}
                    />
                  </FormField>
                  <FormField label="Visa expiry date" error={e?.travelDocument?.visaExpiry?.message}>
                    <DateInput
                      control={form.control}
                      name={`passengers.${i}.travelDocument.visaExpiry`}
                      min={lastTravelDate}
                      blank=""
                    />
                  </FormField>
                  <FormField
                    label="Passport issue date (optional)"
                    error={e?.travelDocument?.passportIssueDate?.message}
                  >
                    <DateInput
                      control={form.control}
                      name={`passengers.${i}.travelDocument.passportIssueDate`}
                      max={travelDate}
                    />
                  </FormField>
                  <FormField
                    label="Visa issue date (optional)"
                    error={e?.travelDocument?.visaIssueDate?.message}
                  >
                    <DateInput
                      control={form.control}
                      name={`passengers.${i}.travelDocument.visaIssueDate`}
                      max={travelDate}
                    />
                  </FormField>
                  <FormField
                    label="Visa entry type (optional)"
                    error={e?.travelDocument?.visaEntryType?.message}
                  >
                    <Select
                      {...register(`passengers.${i}.travelDocument.visaEntryType`, {
                        setValueAs: (v: string) => v || undefined,
                      })}
                    >
                      <option value="">Not applicable</option>
                      {VISA_ENTRY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {VISA_ENTRY_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Electronic travel authorisation no. (if required)"
                    error={e?.travelDocument?.travelAuthorisationNumber?.message}
                  >
                    <Input
                      autoComplete="off"
                      maxLength={25}
                      {...register(`passengers.${i}.travelDocument.travelAuthorisationNumber`, {
                        setValueAs: (v: string) => v.trim().toUpperCase() || undefined,
                      })}
                    />
                  </FormField>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {international && <AdditionalDocumentsChecklist />}

      {!international && (
        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={idDeclared}
            onChange={(event) => {
              setIdDeclared(event.target.checked);
              if (event.target.checked) setIdDeclarationError(null);
            }}
          />
          <span>
            I confirm the passenger names and ID details above match the original government ID each
            traveller will carry to the airport.
            {idDeclarationError && (
              <span role="alert" className="mt-1 block font-semibold text-danger">
                {idDeclarationError}
              </span>
            )}
          </span>
        </label>
      )}

      {international && (
        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={visaDeclared}
            onChange={(event) => {
              setVisaDeclared(event.target.checked);
              if (event.target.checked) setDeclarationError(null);
            }}
          />
          <span>
            I confirm every traveller holds a valid passport and the visa required to enter the
            destination. ZPROO GO cannot refund tickets if boarding is denied for missing documents.
            {declarationError && (
              <span role="alert" className="mt-1 block font-semibold text-danger">
                {declarationError}
              </span>
            )}
          </span>
        </label>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact details</CardTitle>
          <p className="text-sm text-muted">
            We send the e-ticket and flight updates here. Choose a country code for a non-Indian number.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" error={errors.contact?.email?.message}>
            <Input type="email" autoComplete="email" {...register('contact.email')} />
          </FormField>
          <FormField label="Mobile number" error={errors.contact?.phone?.message}>
            <CountryPhoneInput
              countryCode={countryCode}
              onCountryChange={(code) => {
                setValue('contact.countryCode', code, { shouldDirty: true });
                if (watch('contact.phone')) void trigger('contact.phone');
              }}
              {...register('contact.phone')}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Continue to seats <ArrowRight aria-hidden />
        </Button>
      </div>
    </form>
  );
}

function Select(props: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-danger"
    />
  );
}

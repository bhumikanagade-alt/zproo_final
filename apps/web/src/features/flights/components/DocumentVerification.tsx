import { Card, CardContent, CardHeader, CardTitle } from '@zproo/ui';
import { DOCUMENT_STATUS_LABEL, type DocumentCheck, type DocumentStatus } from '@zproo/validation';
import { CircleCheck, Clock, FileCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

const STATUS_STYLE: Record<DocumentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-green-50 text-green-700',
  ACTION_REQUIRED: 'bg-red-50 text-red-700',
};

const STATUS_ICON = {
  PENDING: Clock,
  VERIFIED: CircleCheck,
  ACTION_REQUIRED: TriangleAlert,
} as const;

/** Pending / Verified / Action required pill. */
export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      <Icon aria-hidden className="size-3" />
      {DOCUMENT_STATUS_LABEL[status]}
    </span>
  );
}

const DOMESTIC = {
  intro: 'Please provide valid passenger identification details for your domestic journey within India.',
  required: [
    [
      'Government-issued photo ID',
      'Aadhaar Card, Passport, Voter ID, Driving Licence, or another accepted identity document.',
    ],
    [
      'Passenger name',
      'Must match the name on the accepted identification document and booking requirements.',
    ],
    [
      'Date of birth',
      'Required where applicable, especially for children and infants.',
    ],
  ],
  steps: [
    'Enter passenger details.',
    'Select an accepted identity document.',
    'Review the information for accuracy.',
    'Complete your flight booking.',
    'Carry your accepted original or permitted digital ID and boarding pass to the airport.',
  ],
  important: [
    'Ensure that all passenger details are correct.',
    'Carry valid identification accepted by the airline and airport.',
    'Children and infants may require proof of identity or age.',
    'Document requirements may vary by airline and passenger category.',
  ],
} as const;

const INTERNATIONAL = {
  intro:
    'Please ensure that you have all the required travel documents for your international journey. Requirements depend on your nationality, destination country, transit country and purpose of travel.',
  required: [
    [
      'Passport',
      'Passport number, full name as printed on the passport, nationality, date of birth, issue date, expiry date and issuing country.',
    ],
    [
      'Visa or travel authorisation',
      'Visa type, number, issue and expiry dates and entry type, and an electronic travel authorisation, where required.',
    ],
    [
      'Additional travel documents',
      'Return or onward ticket, accommodation details, transit visa, health or vaccination documents and any other documents the destination requires, where applicable.',
    ],
  ],
  steps: [
    'Enter passport details.',
    'Verify that the passport meets the destination’s validity requirements.',
    'Provide visa or travel authorisation details, if applicable.',
    'Review the information for accuracy.',
    'Confirm that destination and transit entry requirements are met.',
    'Complete your flight booking.',
    'Present the required travel documents at airline check-in and immigration.',
  ],
  important: [
    'Your passport must meet the destination country’s validity requirements.',
    'A visa or travel authorisation is required only where applicable.',
    'Some countries require proof of onward travel, accommodation or sufficient funds.',
    'Meeting airline document checks does not guarantee admission into another country. Final entry decisions are made by the destination’s immigration authorities.',
  ],
} as const;

interface DocumentVerificationPanelProps {
  international: boolean;
  /** One result per traveller, in order. */
  checks: DocumentCheck[];
  /** One label per traveller, e.g. "Adult 1". */
  labels: string[];
  overall: DocumentStatus;
}

/** What to provide, how the check works, and each traveller's verification status. */
export function DocumentVerificationPanel({
  international,
  checks,
  labels,
  overall,
}: DocumentVerificationPanelProps) {
  const copy = international ? INTERNATIONAL : DOMESTIC;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck aria-hidden className="size-5 text-primary" />
            {international ? 'International travel document verification' : 'Document verification'}
          </CardTitle>
          <span className="flex items-center gap-2 text-sm text-muted">
            Verification status <DocumentStatusBadge status={overall} />
          </span>
        </div>
        <p className="text-sm text-muted">{copy.intro}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <details open className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer font-semibold">Required documents</summary>
          <ul className="mt-2 space-y-2">
            {copy.required.map(([title, text]) => (
              <li key={title}>
                <span className="font-semibold">{title}: </span>
                <span className="text-muted">{text}</span>
              </li>
            ))}
          </ul>
        </details>

        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer font-semibold">Verification process</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>

        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer font-semibold">Important information</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {copy.important.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>

        <ul className="space-y-2" aria-label="Verification status for each traveller">
          {checks.map((check, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{labels[i]}</span>
                <DocumentStatusBadge status={check.status} />
              </div>
              {check.issues.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs font-semibold text-danger">
                  {check.issues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              )}
              {check.notes.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
                  {check.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted">
          “Verified” means the details you entered are complete and consistent. The airline and, for
          international travel, the destination’s immigration authority make the final decision when
          you travel.
        </p>
      </CardContent>
    </Card>
  );
}

const ADDITIONAL_DOCUMENTS = [
  ['onward', 'Return or onward ticket'],
  ['accommodation', 'Accommodation details'],
  ['transit', 'Transit visa or authorisation (for connecting countries)'],
  ['health', 'Health or vaccination documents'],
  ['other', 'Other documents required by the destination country'],
] as const;

/** Reminder list of the extra documents some destinations ask for. It never blocks booking. */
export function AdditionalDocumentsChecklist() {
  const [ready, setReady] = useState<Record<string, boolean>>({});
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Additional travel documents</CardTitle>
        <p className="text-sm text-muted">
          Tick the documents you have ready. Only the ones your destination or transit country asks
          for are needed, so check its official immigration website.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {ADDITIONAL_DOCUMENTS.map(([key, label]) => (
          <label key={key} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={Boolean(ready[key])}
              onChange={(event) => setReady({ ...ready, [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

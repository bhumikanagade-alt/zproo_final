import { useMemo } from 'react';
import { RULES } from '../rules';
import { toIsoDate } from '../dates';
import type { CustomerDetails } from '../types';
import { sanitizeLicence, sanitizeMobile, sanitizeName, type CustomerKey, type Errors } from '../validation';
import { SelectField, TextAreaField, TextField } from './ui';

interface Props {
  customer: CustomerDetails;
  errors?: Errors<CustomerKey>;
  onChange: (patch: Partial<CustomerDetails>) => void;
}

/** Rider details collected before the review step. Inputs are sanitised as the rider types. */
export function CustomerForm({ customer, errors = {}, onChange }: Props) {
  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - RULES.minRiderAge);
    return toIsoDate(d);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Full name (as on licence)"
        autoComplete="name"
        value={customer.fullName}
        error={errors.fullName}
        onChange={(e) => onChange({ fullName: sanitizeName(e.target.value) })}
        placeholder="e.g. Rohan Deshmukh"
      />
      <TextField
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={customer.mobile}
        error={errors.mobile}
        hint="10-digit Indian mobile number"
        onChange={(e) => onChange({ mobile: sanitizeMobile(e.target.value) })}
        placeholder="98765 43210"
      />
      <TextField
        label="Email address"
        type="email"
        autoComplete="email"
        value={customer.email}
        error={errors.email}
        onChange={(e) => onChange({ email: e.target.value.trim().slice(0, 254) })}
        placeholder="name@example.com"
      />
      <TextField
        label="Date of birth"
        type="date"
        autoComplete="bday"
        max={maxDob}
        value={customer.dateOfBirth}
        error={errors.dateOfBirth}
        hint={`Riders must be ${RULES.minRiderAge} or older`}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
      />
      <SelectField
        label="Gender"
        value={customer.gender ?? 'MALE'}
        onChange={(e) => onChange({ gender: e.target.value })}
      >
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
        <option value="OTHER">Other</option>
      </SelectField>
      <TextField
        label="Driving licence number"
        className="sm:col-span-2"
        autoCapitalize="characters"
        autoComplete="off"
        value={customer.licenceNumber}
        error={errors.licenceNumber}
        hint="Format: MH1220190012345 (state, RTO, year, serial)"
        onChange={(e) => onChange({ licenceNumber: sanitizeLicence(e.target.value) })}
        placeholder="MH1220190012345"
      />
      <TextAreaField
        label="Current address"
        className="sm:col-span-2"
        autoComplete="street-address"
        maxLength={200}
        value={customer.address}
        error={errors.address}
        onChange={(e) => onChange({ address: e.target.value })}
        placeholder="House / flat, street, area, city, PIN"
      />
    </div>
  );
}

import { Button, Input } from '@zproo/ui';
import { useState, type FormEvent } from 'react';
import { CAREER_EMAIL } from '@/config/contact';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { isEmail, isPhone, submitForm } from './submit';

const TEAMS = ['Engineering', 'Product & Design', 'Operations', 'Customer Support', 'Other'];
type Errors = Partial<Record<'name' | 'email' | 'phone' | 'resume', string>>;

const isUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Career application form shown on /info/careers. */
export function CareerForm() {
  const blank = { name: '', email: '', phone: '', team: TEAMS[0]!, experience: '', resume: '', note: '' };
  const [v, setV] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'email'>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const set = (key: keyof typeof blank) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (v.name.trim().length < 2) next.name = 'Enter your full name';
    if (!isEmail(v.email)) next.email = 'Enter a valid email address';
    if (!isPhone(v.phone)) next.phone = 'Enter a valid phone number';
    if (!isUrl(v.resume)) next.resume = 'Paste a link to your resume or portfolio (https://…)';
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length > 0) return;
    setStatus('sending');
    try {
      const result = await submitForm({
        to: CAREER_EMAIL,
        subject: `Job application: ${v.team} (${v.name.trim()})`,
        fields: { Name: v.name, Email: v.email, Phone: v.phone, 'Team of interest': v.team, Experience: v.experience, 'Resume / portfolio link': v.resume, Note: v.note },
      });
      setStatus(result.mode);
    } catch (err) {
      setStatus('idle');
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'sent' || status === 'email') {
    return (
      <div className="space-y-3">
        <FormAlert tone="success">
          {status === 'sent'
            ? 'Thanks for applying! Our team will review your details and get back to you.'
            : `Your email app should now open with your application ready to send. If it did not, email ${CAREER_EMAIL} with your details.`}
        </FormAlert>
        <Button variant="outline" onClick={() => { setStatus('idle'); setV(blank); }}>Submit another application</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Career application">
      {failure && <FormAlert>{failure}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" error={errors.name}>
          <Input autoComplete="name" value={v.name} onChange={set('name')} maxLength={80} />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <Input type="email" autoComplete="email" value={v.email} onChange={set('email')} maxLength={120} />
        </FormField>
        <FormField label="Phone" error={errors.phone}>
          <Input type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} maxLength={20} />
        </FormField>
        <FormField label="Team you are interested in">
          <select value={v.team} onChange={set('team')} className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
            {TEAMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Years of experience (optional)">
          <Input inputMode="numeric" value={v.experience} onChange={set('experience')} maxLength={2} />
        </FormField>
        <FormField label="Resume / portfolio link" error={errors.resume}>
          <Input type="url" placeholder="https://" value={v.resume} onChange={set('resume')} maxLength={300} />
        </FormField>
      </div>
      <FormField label="Anything else? (optional)">
        <textarea
          rows={4}
          value={v.note}
          onChange={set('note')}
          maxLength={1500}
          className="flex w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </FormField>
      <Button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Submitting…' : 'Submit application'}</Button>
    </form>
  );
}

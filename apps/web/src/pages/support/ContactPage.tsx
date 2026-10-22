import { Button, Input } from '@zproo/ui';
import { Clock, Mail, Phone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Seo } from '@/components/seo/Seo';
import { EmailLink } from '@/components/layout/EmailLink';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { FormField } from '@/features/auth/components/FormField';
import { COMPANY_NAME, DUMMY_SUPPORT_PHONE, SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from '@/config/contact';
import { isLettersName, isStrictEmail, isTenDigitMobile, sanitizeContactName, sanitizeContactPhone, submitForm } from '@/features/contact/submit';

const TOPICS = ['Booking help', 'Cancellation or refund', 'Payment issue', 'Feedback', 'Other'];

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>;

/** /contact: contact details and a working contact form. */
export default function ContactPage() {
  const [values, setValues] = useState({ name: '', email: '', phone: '', topic: TOPICS[0]!, message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'email'>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = 'Enter your name';
    else if (!isLettersName(values.name)) next.name = 'Name can only contain letters (at least 2)';
    if (!values.email.trim()) next.email = 'Enter your email address';
    else if (!isStrictEmail(values.email)) next.email = 'Enter a valid email address, e.g. name@example.com';
    if (!values.phone) next.phone = 'Enter your mobile number';
    else if (!isTenDigitMobile(values.phone)) next.phone = 'Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9)';
    if (values.message.trim().length < 10) next.message = 'Tell us a little more (at least 10 characters)';
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length > 0) return;
    setStatus('sending');
    try {
      const result = await submitForm({
        to: SUPPORT_EMAIL,
        subject: `[${values.topic}] Message from ${values.name.trim()}`,
        fields: { Name: values.name, Email: values.email, Phone: values.phone, Topic: values.topic, Message: values.message },
      });
      setStatus(result.mode);
    } catch (err) {
      setStatus('idle');
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Seo title="Contact us" description="Reach the ZPROO GO team by email, phone or the contact form." />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Talk to us</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">We’re here to help</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
        Questions about a booking, a refund or your account? Send us a message and the {COMPANY_NAME} team will get
        back to you.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <Mail aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">Email</p>
              <EmailLink email={SUPPORT_EMAIL} subject="ZPROO GO support" className="break-all font-bold text-primary hover:underline" />
            </div>
          </div>
          {(
            <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <Phone aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-muted">Customer support (mobile)</p>
                <a href={SUPPORT_PHONE_HREF ?? `tel:${DUMMY_SUPPORT_PHONE.replace(/[^\d+]/g, '')}`} className="font-bold text-primary hover:underline">{SUPPORT_PHONE ?? DUMMY_SUPPORT_PHONE}</a>
              </div>
            </div>
          )}
          <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-muted">Support hours</p>
              <p className="font-bold">{SUPPORT_HOURS}</p>
            </div>
          </div>
        </aside>

        <section aria-label="Contact form" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {status === 'sent' || status === 'email' ? (
            <div className="space-y-3">
              <FormAlert tone="success">
                {status === 'sent'
                  ? 'Thanks! Your message has been sent. We will reply to your email soon.'
                  : 'Your email app should now open with your message ready to send. If it did not, email us at ' + SUPPORT_EMAIL + '.'}
              </FormAlert>
              <Button variant="outline" onClick={() => { setStatus('idle'); setValues({ name: '', email: '', phone: '', topic: TOPICS[0]!, message: '' }); }}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {failure && <FormAlert>{failure}</FormAlert>}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Your name" error={errors.name}>
                  <Input autoComplete="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: sanitizeContactName(e.target.value) }))} maxLength={80} />
                </FormField>
                <FormField label="Email" error={errors.email}>
                  <Input type="email" autoComplete="email" value={values.email} onChange={set('email')} maxLength={120} />
                </FormField>
                <FormField label="Phone" error={errors.phone}>
                  <Input type="tel" inputMode="numeric" autoComplete="tel-national" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: sanitizeContactPhone(e.target.value) }))} maxLength={10} />
                </FormField>
                <FormField label="Topic">
                  <select
                    value={values.topic}
                    onChange={set('topic')}
                    className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {TOPICS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Message" error={errors.message}>
                <textarea
                  rows={5}
                  value={values.message}
                  onChange={set('message')}
                  maxLength={2000}
                  placeholder="Include your booking reference if you have one."
                  className="flex w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm placeholder:text-muted/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-danger"
                />
              </FormField>
              <Button type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

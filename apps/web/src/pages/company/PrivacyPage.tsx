import { LegalLayout } from './LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="What personal data ZPROO GO collects, why, who we share it with, and the choices you have."
      updated="26 September 2026"
      sections={[
        {
          id: 'collect',
          title: 'What we collect',
          body: (
            <ul>
              <li>
                Account details: name, mobile number, email address, and a password if you set one
                (stored only as a secure hash).
              </li>
              <li>
                Traveller details you enter for bookings, such as names, ages and ID details
                required by suppliers.
              </li>
              <li>
                Booking, payment and refund records. Card details are handled by our payment
                gateway, not stored by us.
              </li>
              <li>
                Pickup and drop locations for cab, bike and parcel services, and driver location
                during an active trip.
              </li>
              <li>
                Technical data such as device, browser and IP address, used for security and to
                prevent fraud.
              </li>
            </ul>
          ),
        },
        {
          id: 'use',
          title: 'How we use it',
          body: (
            <ul>
              <li>To create and secure your account, including one-time codes for sign-in.</li>
              <li>
                To make, manage and support your bookings, and send tickets, invoices and trip
                updates.
              </li>
              <li>To process payments, refunds, cashback and wallet transactions.</li>
              <li>To detect and prevent fraud and abuse, and to meet legal obligations.</li>
              <li>With your consent, to send offers. You can opt out at any time.</li>
            </ul>
          ),
        },
        {
          id: 'share',
          title: 'Who we share it with',
          body: (
            <p>
              We share only what is needed: with the airline, operator, hotel, driver or partner
              fulfilling your booking; with payment, SMS and email providers acting on our
              instructions; and with authorities where the law requires. We do not sell your
              personal data.
            </p>
          ),
        },
        {
          id: 'retention',
          title: 'How long we keep it',
          body: (
            <p>
              We keep account data while your account is active, and booking and payment records for
              as long as tax and accounting laws require. One-time codes expire within minutes;
              security logs are kept for a limited period.
            </p>
          ),
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: (
            <p>
              Under the Digital Personal Data Protection Act, 2023 you can access, correct and erase
              your personal data, withdraw consent, and nominate someone to exercise these rights.
              You can update your profile at any time, and contact support for other requests.
            </p>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          body: (
            <p>
              We use encryption in transit, hashed passwords and codes, short-lived sign-in tokens,
              role-based access for staff, and audit logs of sensitive actions. No system is
              perfectly secure; if you suspect misuse of your account, sign out of all devices from
              your profile and contact us.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <p>
              The Data Protection Officer's and grievance officer's contact details will be
              published here before launch.
            </p>
          ),
        },
      ]}
    />
  );
}

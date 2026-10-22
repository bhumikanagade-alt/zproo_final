import { LegalLayout } from './LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      description="The terms that apply when you use ZPROO GO to search, book and pay for travel and mobility services."
      updated="26 September 2026"
      sections={[
        {
          id: 'about',
          title: 'About these terms',
          body: (
            <p>
              These terms form an agreement between you and ZPROO GO when you use our website, apps
              or services. By creating an account or making a booking you accept them. If you book
              for other travellers, you confirm you are authorised to accept these terms on their
              behalf.
            </p>
          ),
        },
        {
          id: 'role',
          title: 'Our role',
          body: (
            <>
              <p>
                For flights, buses, trains, hotels and holiday packages, ZPROO GO acts as a booking
                agent. The service itself is provided by the airline, operator, railway, hotel or
                package partner ("supplier"), whose own conditions of carriage or stay also apply
                and are shown before you pay.
              </p>
              <p>
                Cab, bike taxi and parcel services are provided through drivers and delivery
                partners on the ZPROO GO platform.
              </p>
            </>
          ),
        },
        {
          id: 'account',
          title: 'Your account',
          body: (
            <ul>
              <li>You must be at least 18 years old to create an account and make bookings.</li>
              <li>
                Keep your login secure. Never share one-time codes (OTPs); ZPROO GO staff will never
                ask for them.
              </li>
              <li>
                Provide accurate details. Traveller names must match government ID for flights and
                trains.
              </li>
              <li>We may suspend accounts used for fraud, abuse or breaches of these terms.</li>
            </ul>
          ),
        },
        {
          id: 'bookings',
          title: 'Bookings and prices',
          body: (
            <ul>
              <li>
                Prices include applicable taxes and fees shown on the review page before payment.
              </li>
              <li>
                A booking is confirmed only when payment succeeds and you receive a booking
                reference (ZP-YYYY-XXXXXX).
              </li>
              <li>
                Fares and availability are set by suppliers and can change until payment is
                complete.
              </li>
              <li>Promotional codes have their own conditions and cannot be exchanged for cash.</li>
            </ul>
          ),
        },
        {
          id: 'payments',
          title: 'Payments and ZPROO Wallet',
          body: (
            <p>
              Payments are processed by a regulated payment gateway; ZPROO GO does not store full
              card numbers. ZPROO Wallet balances can be used for bookings on ZPROO GO, are not
              transferable, and are subject to applicable RBI regulations.
            </p>
          ),
        },
        {
          id: 'cancellations',
          title: 'Changes, cancellations and refunds',
          body: (
            <p>
              Cancellation charges depend on the supplier's rules and when you cancel. They are
              shown before you book and before you confirm a cancellation. See the Refund Policy for
              timelines.
            </p>
          ),
        },
        {
          id: 'conduct',
          title: 'Acceptable use',
          body: (
            <ul>
              <li>Don't make speculative, fraudulent or duplicate bookings.</li>
              <li>Don't scrape, overload or attempt to break the security of the service.</li>
              <li>Treat drivers, delivery partners and support staff with respect.</li>
            </ul>
          ),
        },
        {
          id: 'liability',
          title: 'Liability',
          body: (
            <p>
              ZPROO GO is responsible for providing the booking service with reasonable care and
              skill. Suppliers are responsible for the travel services they provide. Nothing in
              these terms limits rights you have under the Consumer Protection Act, 2019 or other
              applicable law.
            </p>
          ),
        },
        {
          id: 'law',
          title: 'Governing law and disputes',
          body: (
            <p>
              These terms are governed by the laws of India. Please contact support first; most
              issues are resolved quickly. The grievance officer's details will be published here.
            </p>
          ),
        },
      ]}
    />
  );
}

import { LegalLayout } from './LegalLayout';

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      description="How cancellations and refunds work across flights, buses, trains, hotels, rides, holidays and parcels."
      updated="26 September 2026"
      sections={[
        {
          id: 'how',
          title: 'How refunds are calculated',
          body: (
            <p>
              The refundable amount depends on the supplier's cancellation rules and how long before
              travel you cancel. Each booking shows its policy — full refund, partial refund or
              non-refundable — before you pay, and the exact refund before you confirm a
              cancellation.
            </p>
          ),
        },
        {
          id: 'services',
          title: 'By service',
          body: (
            <ul>
              <li>
                Flights: as per the airline's fare rules; airline cancellation charges and any ZPROO
                GO fee are shown upfront.
              </li>
              <li>
                Buses: as per the operator's time-based slabs; cancellation may not be possible
                close to departure.
              </li>
              <li>Trains: as per Indian Railways rules for the ticket's class and status.</li>
              <li>
                Hotels: free cancellation until the deadline shown on the room; after that, the
                stated charge applies.
              </li>
              <li>
                Cabs and bikes: free before a driver is assigned; a small fee may apply after
                assignment.
              </li>
              <li>Holidays and parcels: as per the package or shipment terms shown at booking.</li>
            </ul>
          ),
        },
        {
          id: 'timelines',
          title: 'When you get your money',
          body: (
            <ul>
              <li>To ZPROO Wallet: immediately after the refund is processed.</li>
              <li>
                To UPI, cards or net banking: usually 5–7 business days after processing, depending
                on your bank.
              </li>
              <li>You can track every refund's status from My Bookings.</li>
            </ul>
          ),
        },
        {
          id: 'failed',
          title: 'Failed or duplicate payments',
          body: (
            <p>
              If money was debited but no booking was confirmed, it is refunded automatically to the
              original payment method. If you don't see it within 7 business days, contact support
              with your payment reference.
            </p>
          ),
        },
        {
          id: 'supplier',
          title: 'Supplier cancellations',
          body: (
            <p>
              If an airline, operator or hotel cancels, you are entitled to the refund or
              alternative the supplier offers under its rules and applicable regulations. We will
              notify you and help you choose.
            </p>
          ),
        },
      ]}
    />
  );
}

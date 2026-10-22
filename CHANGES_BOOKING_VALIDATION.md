# Booking timer, validation and international flights

- Timer: `bookingSession.begin(key)` restarts the 15-minute hold whenever a different bus (`bus:<tripId>`) or flight (`flight:<offerIds>`) is chosen. Called from `useFlightDraft.start`, `useBusDraft.start` and the bus seats page.
- Names (flight + bus): first word needs 2+ letters, letters/spaces only, no digits, no "aaaa".
- Phone (bus): Indian 10 digits, starts 6-9, rejects 0000000000 / 9999999999, never > 10 digits.
- Phone (flight): country-code picker (30 countries, all national numbers <= 10 digits), sent to the API as E.164.
- International flights: passport (number, issuing country, expiry >= 6 months after last flight), nationality, visa (type, number, expiry >= travel date), DOB for everyone and a visa declaration. Enforced in the form, API (`booking.service.ts`) and static engine.
- Tests: `packages/validation/src/rules.test.ts`, `apps/web/src/features/checkout/bookingSession.test.ts`.

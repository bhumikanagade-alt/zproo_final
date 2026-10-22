# Bug-report fixes (ZPROO GO website)

Source: *ZPROO GO Website — Bug Report & Pending Improvements*.

## 1. General website issues
| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | Talk to us page pending | New real `/contact` page (and `/help`) with contact details + validated form. "Talk to us" buttons now go there. | `pages/support/ContactPage.tsx`, `features/contact/submit.ts`, `routes/routes.tsx`, `features/info/components/PageLayout.tsx` |
| 2 | Email link unresponsive | New `EmailLink`: opens the email app, copies the address and offers the contact form as a fallback. Used on info, legal, blog and contact pages. Hotel voucher help link had a wrong domain (`zproo.go`) – fixed. | `components/layout/EmailLink.tsx`, `features/hotels/voucher.ts` |
| 3 | Careers incomplete | Application form on `/info/careers` (name, email, phone, team, experience, resume link, note). | `features/contact/CareerForm.tsx` |
| 4 | Support shows email only | Phone shown on Contact, Help, info-page footer CTA and site footer. **Set `VITE_SUPPORT_PHONE` in `.env`** (no verified number exists in the project, so none is invented). | `config/contact.ts`, `.env.example` |
| 5 | Install App redirects wrongly | New `/install-app` page: "The ZPROO GO app is coming soon. Stay tuned for updates!" | `pages/support/InstallAppPage.tsx` |

Forms: with `VITE_FORM_ENDPOINT` set (e.g. Formspree) messages are POSTed there; otherwise the visitor's email app opens pre-filled, so it works with no backend.

## 2. Module-specific
- **Cab – identical pickup/drop:** comparison now ignores case/spacing/punctuation and matches saved places ("Shivajinagar" = "Shivajinagar, Pune"); clearer message (`features/cabs/validation.ts`, `CabRoutePage.tsx`). Rental mode (no drop) is unaffected.
- **Cab – nearby options:** "Nearby landmarks" (Mall / Hotel / Bus Stop / Metro Station) were plain text; they are now buttons that set the pickup point (`CabPickupPage.tsx`). Receipt download no longer revokes its blob URL instantly (failed in Firefox/Safari).
- **Flight – DOB:** rule centralised in `isDobRequired()` (adult + domestic = optional; child/infant or international = required) and a hint under the field explains why. Note: the existing code already treated adult domestic DOB as optional, so I could not reproduce a case where it was wrongly required – please send the exact steps if you still see it.
- **Bus – Today/Tomorrow:** the date shown was read with `getValues()` (no re-render), so the buttons looked dead. Now uses `watch()`, highlights the active shortcut, and re-runs the search on the results page.

## 3. Common issues
1. **Download Ticket:** the ticket page linked to `/api/.../ticket.pdf` (does not exist in demo mode; needs auth in API mode). Now: demo mode opens the printable ticket and starts "Save as PDF"; API mode downloads the PDF with the auth token and shows real error messages. (`features/checkout/api.ts`, `pages/account/TicketPage.tsx`)
2. **"Done" red:** on the final step "Done" was drawn as the active (red) step; it is now green with all earlier steps (`BookingSteps.tsx`).
3. **Savings:** "You saved ₹X" shown only when a discount was actually applied – fare summary, e-ticket, cab confirmation.
4. **Extra "+" before total:** removed; replaced by a "View price breakdown" text link (`PriceSummary.tsx`). FAQ text updated.

## Not verified
Dependencies could not be installed in the editing environment, so the build and test suite were **not run**. Please run `npm install && npm run build && npm test` before deploying.

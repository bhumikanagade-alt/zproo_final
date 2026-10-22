# Railway: validation, responsive layout and hero image

## Validation
- `packages/validation/src/search.ts`: `trainNumberSchema`, `liveStatusSchema` (train number + date window).
- `packages/validation/src/booking.ts`: duplicate-passenger rule (same name, age, gender) shared by web form and API.
- `packages/validation/src/trains.test.ts`: tests for both.
- Search form: From/To re-checked together on change/swap; error summary after a failed submit.
- Passenger form: names sanitised/trimmed, max lengths, first-error focus + scroll, error count banner.
- Live status: validated with the shared schema; date limited to the live window; field-level errors.
- Cancel ticket: at least one passenger required (same rule as API), message shown instead of a silent disabled button.

## Responsive
- Hero (`TravelHero.tsx`): smaller heights/titles on phones, stronger scrim, per-breakpoint image focus.
- Search form: tablet (sm/md) two-column grid, full-width search button.
- Train card: flexible route row, 2/3/4-column class grid, full-width Continue on phones.
- Passenger form: single column on phones, sticky "Continue" bar, full-width actions.
- Cancel page / results header / live status form: stack on phones.

## Background image
- `apps/web/public/assets/banners/train-1024.webp` and `train-1920.webp` (illustrated dusk railway scene).
- To use a real photo, replace those two files (keep names; 1920x737 and 1024x393 recommended).

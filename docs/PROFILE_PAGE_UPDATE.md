# ZPROO GO — Profile Page Update

This update adds personal profile details, profile-photo upload, and an authenticated change-password flow.

## Profile changes

- Date of birth
- Gender
- Indian state / Union Territory
- Profile photo with camera button
- JPG/PNG/WEBP validation
- Client-side photo resizing/compression before upload
- Existing Google/social avatar URLs continue to work

## Password changes

The **Reset** action on the Profile page now opens a modal instead of navigating to Home.

The modal validates:

- Current password is required
- New password is at least 8 characters
- New password contains letters and numbers
- New password must differ from the current password
- Confirmation must match
- Show/hide password controls
- Loading and API error states

The API verifies the current password with Argon2, stores the new Argon2id hash, revokes existing refresh sessions, and records an audit event. The browser is then signed out and sent to the login page with a success notice.

## Database migration

After replacing the project with this version, run from the project root:

```bash
npm install
npm run db:generate
npm run db:migrate
```

The migration adds nullable `date_of_birth`, `gender`, and `state` columns to `users`.

## Main files changed

- `apps/web/src/pages/account/ProfilePage.tsx`
- `apps/web/src/features/auth/api.ts`
- `apps/web/src/static/auth.ts`
- `apps/web/src/static/core.ts`
- `packages/validation/src/auth.ts`
- `packages/types/src/auth.ts`
- `apps/api/src/models/user.dto.ts`
- `apps/api/src/services/user.service.ts`
- `apps/api/src/controllers/me.controller.ts`
- `apps/api/src/routes/me.routes.ts`
- `apps/api/src/container.ts`
- `apps/api/src/docs/paths/auth.ts`
- `apps/api/test/me.test.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260930103600_profile_details/migration.sql`

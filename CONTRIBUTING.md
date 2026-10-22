# Contributing to ZPROO GO

## Workflow

1. Branch from `main`.
2. Keep each change focused; one module or concern per pull request.
3. Before pushing, run what CI runs:
   ```bash
   npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
   ```
4. Open a pull request. CI must be green before merge.

## Code rules

- **Strict TypeScript.** No `any`, no `@ts-ignore`. Prefer `unknown` and narrow it.
- **Layering (API):** `routes → validate → controller → service → repository/provider`.
  Controllers handle HTTP only; business rules live in services; Prisma lives in repositories;
  external APIs live behind provider interfaces.
- **Layering (web):** pages are thin; data fetching lives in `features/<domain>/hooks.ts`
  (TanStack Query); shared UI lives in `packages/ui`; no business logic in components.
- **Validation:** shared Zod schemas go in `packages/validation` so the browser and the API agree.
- **Money:** always integer paise (`@zproo/utils` money helpers). Never floats.
- **Errors:** throw the `AppError` subclasses in `apps/api/src/utils/errors.ts`; never send ad-hoc
  error JSON.
- **Brand:** always render the logo through `<Logo />`. Never recreate, recolour or stretch it.
- **Secrets:** never commit `.env` or credentials; never log passwords, OTPs, tokens or card data.
- **Accessibility:** semantic HTML, labelled controls, visible focus; the lint rules enforce the basics.

## Database changes

1. Edit `prisma/schema.prisma` (snake_case `@map`/`@@map`, indexes for every foreign key and filter).
2. `npm run db:migrate -- --name <what_changed>` and commit the generated migration.
3. Never edit a migration that has been merged; add a new one.

## Commits

Use clear, imperative messages, e.g. `feat(flights): add fare rules endpoint`, `fix(api): map P2002 to 409`.

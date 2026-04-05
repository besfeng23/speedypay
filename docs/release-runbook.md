# SpeedyPay Admin Console Release Runbook

## 1) Required environment variables

### Server-only (must NOT be prefixed with `NEXT_PUBLIC_`)

- `AUTH_SESSION_SECRET` (minimum 32 chars)
- `ADMIN_EMAILS` (comma-separated admin allowlist)
- `DATABASE_URL` (`postgres://` or `postgresql://`)
- `DATABASE_REQUIRE_SSL` (`true` or `false`)
- `DATABASE_POOL_MAX` (optional integer > 0)
- `DATABASE_POOL_IDLE_MS` (optional integer >= 0)
- `SPEEDYPAY_MERCH_SEQ`
- `SPEEDYPAY_SECRET_KEY`
- `SPEEDYPAY_NOTIFY_URL` (absolute URL, `https://` in production)
- `SPEEDYPAY_PAYOUT_BASE_URL_PROD` (optional absolute URL)
- `SPEEDYPAY_PAYOUT_BASE_URL_TEST` (optional absolute URL)
- `SPEEDYPAY_CASHIER_BASE_URL_PROD` (optional absolute URL)
- `SPEEDYPAY_CASHIER_BASE_URL_TEST` (optional absolute URL)

### Public (safe for client exposure, must be prefixed with `NEXT_PUBLIC_`)

- `NEXT_PUBLIC_SPEEDYPAY_ENV` (`test` or `production`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

## 2) Deployment order

1. Provision/update environment variables in the deployment platform.
2. Run migrations against the target database:
   - `npm run db:migrate`
3. Deploy the application build.
4. Run post-deploy smoke tests (see `docs/smoke-test-checklist.md`).

## 3) Migration command

- `npm run db:migrate`

This command is idempotent and safe for repeated runs due to `schema_migrations` tracking and advisory lock usage in the migration bootstrap path.

## 4) Post-deploy checks

- Confirm login works for an allowlisted admin (`ADMIN_EMAILS`).
- Confirm protected routes reject unauthenticated and non-admin users.
- Confirm payment creation flow succeeds and records audit logs.
- Confirm settlement/remittance transitions execute and log outcomes.
- Confirm webhook duplicate delivery is deduplicated.
- Confirm failed webhook processing produces retry behavior and corresponding audit entries.

## 5) Rollback considerations

- App rollback: redeploy previous known-good image/version.
- Database rollback: this repo currently has forward-only SQL migrations; DB rollback should be done via provider snapshot restore or manual compensating migration.
- If rollback is needed due to env/config errors, first restore prior env set, then redeploy prior image.

## 6) Known risks / follow-up

- `next@14.2.35` currently carries unresolved advisories requiring a major upgrade to `next@16.x`.
- Some low-risk transitive advisories originate from Genkit/Firebase-admin dependency chains and may require coordinated upstream package updates.

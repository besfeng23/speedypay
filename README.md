# SpeedyPay

This is a Next.js administrative console for marketplace payments operations. It supports merchant management, payment tracking, settlements/remittance orchestration, webhook processing, and admin-only access controls.

## Getting Started

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002).

## Environment configuration

Create a `.env.local` (or deployment env vars) with the following values.

### Public Firebase configuration (`NEXT_PUBLIC_*`)

These are safe to expose to the browser and are required for client auth initialization:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA4DllorDCZYfdklcMepmrE7RB22IpX1jM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=speedypay-ab72e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=speedypay-ab72e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=speedypay-ab72e.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=240360044478
NEXT_PUBLIC_FIREBASE_APP_ID=1:240360044478:web:55952599aed9dd0d4f2bef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LHYT01DLCN
```

### Server-only configuration (must NOT use `NEXT_PUBLIC_`)

```bash
AUTH_SESSION_SECRET=replace-with-a-32-char-plus-secret
ADMIN_EMAILS=admin1@example.com,admin2@example.com
DATABASE_URL=postgresql://...
DATABASE_REQUIRE_SSL=true
SPEEDYPAY_MERCH_SEQ=...
SPEEDYPAY_SECRET_KEY=...
SPEEDYPAY_NOTIFY_URL=https://your-domain.example/api/webhooks/speedypay
```

Additional optional variables are documented in `docs/release-runbook.md`.

## Managed database requirements (production)

Production paths require managed PostgreSQL-compatible storage.

Required:

- `DATABASE_URL` (`postgres://` or `postgresql://`)
- `DATABASE_REQUIRE_SSL=true` when your provider requires TLS (`sslmode=require` should be present in `DATABASE_URL`)

Optional pool controls:

- `DATABASE_POOL_MAX` (default: `10`)
- `DATABASE_POOL_IDLE_MS` (default: `10000`)

Run migrations:

```bash
npm run db:migrate
```

## Production deployment docs

- Release runbook: `docs/release-runbook.md`
- Smoke tests: `docs/smoke-test-checklist.md`

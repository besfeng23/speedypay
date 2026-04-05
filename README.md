# Speedy-pay

This is a Next.js application built to serve as an administrative console for a marketplace payments platform. It includes features for managing merchants, tracking payments, orchestrating settlements, and handling remittances.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

## Managed database requirements (production)

This app now requires a managed PostgreSQL-compatible database and no longer supports local SQLite for production paths.

Required environment variables:

- `DATABASE_URL` (must be `postgres://` or `postgresql://`)
- `DATABASE_REQUIRE_SSL=true` when your provider requires TLS (`sslmode=require` should be present in `DATABASE_URL`)

Optional pool controls:

- `DATABASE_POOL_MAX` (default: `10`)
- `DATABASE_POOL_IDLE_MS` (default: `10000`)

Run schema bootstrap/migrations:

```bash
npm run db:migrate
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Key Features

- **Dashboard:** An overview of key financial metrics and recent activity.
- **Merchant Management:** Onboard new merchants and manage existing ones.
- **Payment Tracking:** View a detailed history of all payments collected.
- **Settlement Orchestration:** Track the internal settlement of funds before payout.
- **Remittance Handling:** Initiate and monitor payouts to merchants.
- **Audit Logs:** A complete trail of all significant system events.
- **AI-Powered Tools:** Includes a payment simulator and dashboard insights generator.
# speedypay


## Production deployment docs

- Release runbook: `docs/release-runbook.md`
- Smoke tests: `docs/smoke-test-checklist.md`


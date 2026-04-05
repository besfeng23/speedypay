# Production Smoke Test Checklist

## Preconditions

- Production env vars are set and pass startup validation.
- Migrations have completed (`npm run db:migrate`).

## Checklist

1. **Login/session creation**
   - Sign in via Firebase.
   - Verify `POST /api/auth/session` returns `200` and sets `sp_admin_session` cookie.

2. **Admin route protection**
   - Without session cookie, hit `/dashboard` and confirm redirect to `/login`.
   - With non-admin email, confirm `403` behavior where applicable.

3. **Payment creation**
   - Create manual payment from UI.
   - Verify payment appears in transactions and audit event `payment.created` exists.

4. **Settlement flow**
   - Trigger remittance initiation from settlement details.
   - Verify settlement transitions and provider response fields are persisted.

5. **Webhook duplicate delivery**
   - Replay same webhook payload twice.
   - First call should process, second should return success without duplicate state mutation.

6. **Webhook failed processing retry**
   - Force a transient processing failure (e.g., invalid internal state for target entity).
   - Verify webhook returns `failed`, claim is released, and retry can process once condition is corrected.

7. **Audit log generation**
   - Verify auth, payment, settlement, and webhook events are present in `/audit-logs`.

8. **Logout/session invalidation**
   - Call logout flow and verify cookie removal.
   - Revisit protected route and confirm redirect to `/login`.

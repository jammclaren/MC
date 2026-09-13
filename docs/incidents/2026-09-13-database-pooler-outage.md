# 2026-09-13 — Database connection pool exhaustion (two outages)

## Summary

Production hit two separate outages on the same day, both with the identical
signature: Supabase's connection pooler rejected new connections, which
Prisma surfaced first as a `(ECIRCUITBREAKER) too many authentication
failures` error and then, once the breaker tripped, as a plain "provided
database credentials are not valid" (`P1000`) error — even though the
credentials were fine. Both incidents self-resolved without intervention.
The underlying cause has since been fixed by moving off the connection-mode
that was being exhausted.

## Impact

- **Incident 1, ~19:54–20:05 (~11 min):** affected `/`, `/login` (POST
  callback), and `/election-ops`. Anyone hitting an affected route saw a
  raw framework error page (no graceful fallback existed yet).
- **Incident 2, ~20:33–20:41 (~8 min):** affected `/`, `/incidents`,
  `/bpe-deployment`. By this point the error boundary below was live, so
  authenticated users would have seen the "Temporarily Unavailable" retry
  screen instead of a raw crash.

Both times, production recovered on its own; no data was lost or corrupted.

## Root cause

The app's `DATABASE_URL` pointed at Supabase's **Session-mode** pooler
(port 5432), which caps concurrent connections at `pool_size: 15`. That
ceiling is easy to exhaust under connection churn — many short-lived
connections opened in quick succession rather than a few long-lived ones —
because Session mode is designed for the opposite pattern (few clients
holding a connection open for a long session).

Once the ceiling is hit, Supabase's pooler doesn't just queue or reject the
excess connection — it escalates into a circuit-breaker state that then
rejects *even valid* reconnection attempts as authentication failures for
several minutes, which is what made both incidents look worse than plain
"pool full" errors.

**Contributing factor:** a large amount of ad-hoc `npx tsx scratch-*.ts`
script usage against the same shared database (used for both local dev and
production) throughout an extended debugging/verification session, each
script opening its own fresh connection. Incident 2 in particular was
directly triggered while verifying a fix on production (repeated deploys,
login attempts, and a temporary test-account endpoint in a short window) —
i.e., the act of testing the system re-triggered the same class of failure
it was meant to guard against.

## Resolution

1. **Added a global error boundary** ([`src/app/error.tsx`](../../src/app/error.tsx))
   so any uncaught error — this class of transient DB failure included —
   shows a "Temporarily Unavailable, your data is safe" screen with a Retry
   button instead of a raw crash page.
2. **Switched `DATABASE_URL` to Supabase's Transaction-mode pooler**
   (port 6543) in Vercel's Production and Preview environments, and in
   local `.env`. Transaction mode is built for many concurrent short-lived
   connections and does not carry the same 15-connection Session-mode
   ceiling.
3. **Rotated the database password** as part of retrieving the new
   connection string from the Supabase dashboard. The old password is
   retired — anywhere it was stored (password managers, other machines)
   should be updated or discarded.

Each change was verified live in production by submitting deliberately
invalid login credentials and confirming the app's normal "Invalid email or
password" response (rather than a 500/crash), both to confirm health before
changes and to confirm the fix afterward.

## Follow-ups / recommendations

- Avoid opening many fresh ad-hoc database connections in quick succession
  during investigation/testing (scratch scripts, repeated manual login
  checks) — prefer a single reused connection or batching checks, since the
  Transaction-mode pooler raises the ceiling but doesn't remove it.
- Consider dashboard-level monitoring/alerting on Supabase connection-pool
  saturation so a recurrence is caught before it affects users.
- If further headroom is needed, Supabase's dashboard also allows raising
  `pool_size` directly or upgrading the project's plan tier.

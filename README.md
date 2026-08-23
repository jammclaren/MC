# WESMINCOM Tactical C2 Dashboard

Internal Command & Control monitoring dashboard for Western Mindanao Command
(WESMINCOM), replacing disconnected Excel/Google Sheets with a single,
permissioned, database-backed web application. See [`SPEC.md`](./SPEC.md) for
the full build spec this project was scaffolded from.

Two data domains: quarterly counter-threat **accomplishments** reporting
(CTG / LTG / CBC) and **BPE 2026 election security operations** for the BARMM
Parliamentary Election.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts,
PostgreSQL + Prisma ORM 7, NextAuth v5 (Credentials provider) with a custom
RBAC layer, Leaflet for mapping (no online tile dependency — see
[Mapping](#mapping) below), Docker Compose for on-prem deployment.

## Prerequisites

- Node.js 20.9+ (this project was built against Node 24)
- A Postgres database — either local via Docker Desktop (WSL2 backend on
  Windows), or a hosted instance (e.g. Supabase — see below)
- A `.env` file (copy `.env.example`)

## Database: local Docker vs. hosted (e.g. Supabase)

`docker-compose.yml`'s `db` service is the default for fully air-gapped/on-prem
deployment (SPEC.md's target environment). For development or a non-air-gapped
deployment, `DATABASE_URL` can point at any Postgres instance instead,
including a hosted one like Supabase — Prisma doesn't care which.

If pointing at Supabase specifically: use the **Session pooler** connection
string (Project Settings → Database → Connection string → Session pooler,
port 5432), not the direct `db.<ref>.supabase.co` host. That direct host only
resolves to an IPv6 address unless the project has the (paid) dedicated IPv4
add-on, and most local networks/ISPs can't reach it — you'll see `P1001:
Can't reach database server`. The pooler host resolves to IPv4 and works from
anywhere.

**On a serverless host (Vercel, etc.) use the Transaction pooler instead**
(same dashboard page, port 6543, add `?pgbouncer=true`). Session mode caps
concurrent clients low (Supabase's free tier: 15) and each serverless
invocation can open its own connection — a handful of concurrent page loads
is enough to hit `(EMAXCONNSESSION) max clients reached in session mode`.
Transaction mode multiplexes many client connections over few actual
Postgres connections and is what Supabase recommends for exactly this
"many short-lived serverless connections" pattern. Keep using the Session
pooler for one long-running process (local dev, Docker/on-prem).

## Deploying to Vercel

```bash
npx vercel link                                  # first time only
npx vercel env add DATABASE_URL production       # Transaction pooler string, see above
npx vercel env add NEXTAUTH_SECRET production    # openssl rand -base64 32
npx vercel env add NEXTAUTH_URL production        # https://<your-project>.vercel.app
npx vercel --prod
```

Migrations aren't run automatically on deploy — apply them from a machine
that can reach the database (`npm run db:migrate`, or `db:deploy` in CI)
before or after pushing schema changes, same as any other environment.

## Local development setup

```bash
npm install
docker compose up -d db          # only if using local Postgres, not Supabase
npm run db:migrate                # creates the schema
npm run db:seed                   # seeds JTFs, indicator taxonomy, admin user
npm run dev
```

Open http://localhost:3000. Log in with the seeded admin account:

```
admin@wesmincom.local / ChangeMe123!
```

**Change this password immediately** (Admin → Users → Edit → set a new
password) — it's a well-known default, not a secret.

### What's seeded vs. what isn't

The seed script (`prisma/seed.ts`) creates the four JTFs, the CTG/LTG
indicator taxonomy, and the default admin account. It does **not** invent any
operational figures — neutralized-personality counts, firearms recovered,
RIDO settlements, troop deployment numbers, incidents, or named HVI entries.
No source deck/PDF with real numbers was available when this project was
scaffolded, and fabricating counter-terrorism statistics for a real command
would be actively harmful. All of that data is meant to be entered by JTF
staff through the app itself, or the seed script can be extended with real
source-deck numbers if/when they're available.

### Other useful scripts

```bash
npm run db:studio     # Prisma Studio — browse/edit the DB directly
npm run test          # runs src/**/*.test.ts (currently: computePriorityScore)
npm run lint          # ESLint
```

## Production deployment (Docker Compose)

Fully on-prem / air-gapped, no cloud dependency:

```bash
cp .env.example .env      # fill in a real NEXTAUTH_SECRET and DB credentials
docker compose up -d --build
```

This starts Postgres and the app together; the app container runs
`prisma migrate deploy` on startup before serving traffic. Seed the database
separately if needed (`docker compose exec app npx prisma db seed`).

## Mapping

The Priority/Hotspot Map (`/priority-map`) uses Leaflet, styled as a blue
"Blue Force Tracking" HUD (grid background, glassy province fill,
decorative contour rings, corner-bracket framing). It originally shipped
**without** an online tile layer, since the intended deployment was
air-gapped with no internet egress — the app has since moved to Vercel +
Supabase (cloud-hosted, not air-gapped), so it now offers a base-layer
switcher (bottom of the zoom control, top-left) with two choices:

- **OpenStreetMap** (default) — a live online tile layer.
- **Tactical Grid (Offline)** — no tiles at all, just the CSS HUD grid
  behind the vector overlays, for anyone who does deploy this on an
  isolated network.

Two static local GeoJSON files provide the vector data, both sourced from
[faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps)
(MIT licensed; PSGC 2023 boundaries, lowres/simplified):

- `public/barmm-provinces.geojson` — BARMM's 6 provinces (Basilan, Lanao
  del Sur, Maguindanao del Norte, Maguindanao del Sur, Sulu, Tawi-Tawi) plus
  the Cotabato City/Isabela City special geographic area. The map fits to
  this outline's bounds on load.
- `public/barmm-barangays.geojson` — ~1,963 barangay boundary polygons
  (of 2,093 imported `ElectionArea` records — see below), filled by
  `hotspotCategory` (Red/Orange/Yellow/Green). `ElectionArea` records
  without a matching polygon (no lat/lng centroid either) still fall back
  to a `CircleMarker`, so nothing with coordinates silently disappears.

Both the province outline, the contour rings, and the barangay
categorization layer are independently toggleable overlays in the same
layers control. Clicking/hovering a barangay shows its hotspot category,
computed priority score, recent incident count, and deployment.

The barangay-level data (`hotspotCategory`/`hotspotReason` on 2,093
`ElectionArea` rows across Basilan, Lanao del Sur, Maguindanao del
Norte/Sur, Cotabato City, SGA-BARMM, and Tawi-Tawi) was bulk-imported from
a threat-categorization spreadsheet (color-fill-encoded, not text) —
see git history for the one-time import script; it isn't kept in the repo
since it's a one-shot data load, not a reusable tool.

To swap in a different basemap later:

- **Self-hosted raster/vector tiles**: add another
  `<LayersControl.BaseLayer>` with a `<TileLayer url="...">` inside
  `src/components/priority-map.tsx`.
- **A different/updated GeoJSON**: replace the relevant `public/*.geojson`
  file — the fetch and `<GeoJSON>` render logic don't care about the
  specific boundaries, only that province features have an `adm2_en`
  property (tooltip label) and barangay features have `province`/
  `municipality`/`barangay` properties (joined against `ElectionArea` rows
  by those three fields).

## RBAC

Enforced server-side in every API route and page (never trusted from the
client) via `src/lib/rbac.ts`. Summary:

| Role          | Read scope                                    | Write scope                          |
| ------------- | ---------------------------------------------- | ------------------------------------- |
| ADMIN         | everything                                     | user management, all data             |
| COMMAND       | all JTFs, all domains                          | none (read-only)                      |
| JTF_COMMANDER | own JTF full detail, other JTFs **rollup-only** | own JTF                               |
| JTF_STAFF     | own JTF                                        | own JTF, own entries only (edit/delete) |
| VIEWER        | whatever scope assigned at account creation    | none                                   |
| WFC_STAFF     | everything (command-wide, like COMMAND)        | none (read-only)                      |

"Rollup-only" means aggregate/summary data (deployment totals, accomplishment
sums) — not row-level detail like individual incidents or named HVI entries.

**WFC_STAFF** ("Warfighting Function Cell" staff — command-level staff
organized by function rather than by JTF: Command & Control, Intelligence,
Fires, Maneuver, Protection, Sustainment) has `jtfId = null` and a
`warfightingFunction` set instead. Read scope falls out of the existing
"unscoped user reads everything" rule (`rbac.ts`'s `canReadJtf`/`canReadRollup`
key off `jtfId === null`) with zero special-casing; write access is denied by
the existing role allow-list in `canWriteJtf`/`canModifyEntry`, which already
excludes any role it doesn't explicitly name. Assigned/edited from Admin →
Users, same as any other account.

Every mutation goes through `src/lib/audit.ts`'s `withAudit()`, which writes
the change and its `AuditLog` row in the same database transaction.

## Priority scoring

`src/lib/priority-score.ts`'s `computePriorityScore()` is the MVP "areas to
prioritize" heuristic from the spec — deliberately transparent, not ML. Read
it top to bottom; the weight tables (`HOTSPOT_WEIGHTS`,
`INCIDENT_SEVERITY_WEIGHTS`) are plain, editable constants command staff can
challenge and adjust. Covered by unit tests in
`src/lib/priority-score.test.ts`.

## Phase 2 / Not built

Explicitly out of scope for this MVP (per SPEC.md §3):

- Mobile app
- Offline sync
- Live integration with COMELEC/PNP systems
- Predictive/ML threat scoring (the priority heuristic here is intentionally
  simple and transparent, not a model)
- Automated slide-deck export

## Security notes

- All routes require authentication (`src/proxy.ts` — Next.js 16 renamed
  `middleware.ts` to `proxy.ts`); no anonymous access.
- Passwords hashed with bcrypt (`bcryptjs`), never logged.
- Percentages are always computed from raw stored numbers
  (`src/lib/percentages.ts`'s `safePercent()`), guarded against
  divide-by-zero — the exact bug class (`#DIV/0!`) the source spreadsheets
  were full of.
- `.env` is gitignored; use `.env.example` as a template and never commit
  real secrets.
"# MC" 

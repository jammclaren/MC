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
- Docker Desktop (with its WSL2 backend, on Windows) — for local Postgres and
  for the production Docker Compose deployment
- A `.env` file (copy `.env.example`)

## Local development setup

```bash
npm install
docker compose up -d db          # starts just Postgres, not the app
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

The Priority/Hotspot Map (`/priority-map`) uses Leaflet with vector
`CircleMarker`s, deliberately **without** an online tile layer, since the
intended deployment is air-gapped with no internet egress. Markers are
color-coded by `hotspotCategory` and sized by the computed priority score;
clicking one shows precinct count, registered voters, deployment, and recent
incident count.

No basemap tiles or an actual Mindanao/BARMM GeoJSON boundary file were
available when this was built. To add a basemap later:

- **Self-hosted raster/vector tiles**: add a `<TileLayer url="...">` inside
  `src/components/priority-map.tsx`.
- **Static GeoJSON boundary overlay**: drop the file in `public/`, load it
  with `fetch`/`import`, and render it with react-leaflet's `<GeoJSON>`.

Nothing else about the component needs to change either way — the map
provider is intentionally swappable.

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

"Rollup-only" means aggregate/summary data (deployment totals, accomplishment
sums) — not row-level detail like individual incidents or named HVI entries.

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

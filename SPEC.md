SPEC.md — WESMINCOM Tactical C2 Dashboard (MVP)
> **Paste this whole file into Claude Code as your first prompt.** It is written as a
> master build spec — read it fully, ask me clarifying questions only where marked
> `[CONFIRM]`, then scaffold the project incrementally (schema → API → UI → seed data),
> committing at each milestone.
---
1. Context
You are building an internal Command & Control (C2) monitoring dashboard for
Western Mindanao Command (WESMINCOM), an Armed Forces of the Philippines
unit organized into four Joint Task Forces: JTF ZAMPELAN, JTF ORION, JTF CENTRAL,
JTF POSEIDON.
Today this data lives in disconnected Excel/Google Sheets files, manually
compiled into slide decks. There is no single source of truth, no access
control, and no way to see priorities at a glance. This tool replaces that
workflow with a single, permissioned, database-backed web dashboard.
Two data domains feed the dashboard (confirmed from the source deck and
linked sheets):
Accomplishments Reporting — periodic (quarterly) counter-threat metrics
tracked against annual targets, broken into three threat categories:
CTG (Communist Terrorist Group) — neutralized personalities
(captured/killed/apprehended/surrendered, split PSR/NPSR), firearms
recovered/surrendered/confiscated/captured, Regional/Sub-Regional/
horizontal Party Committees dismantled, named HVI (High-Value Individual)
neutralization log entries.
LTG (Local Terrorist Groups: DI-Maute, DI-Hassan, BIFF-Bungos) —
same neutralized-personality and firearms structure, plus "LTG Cell
Defeated" tracked per JTF, plus named HVI log.
CBC (Community-Based Conflict) — RIDO (clan feud) settlements,
broken out by LLEs/PAGs, MNLF, MILF involvement, tracked per JTF per
quarter.
BPE 2026 Election Security Operations — deployment and operational
tracking for the BARMM Parliamentary Election (30 Jul–15 Sep 2026),
per JTF, down to the unit/municipality/barangay level:
Troop deployment (AFP officer/enlisted/CAA/WAVs-TAV counts, PNP
counts, QRF numbers) vs. polling precincts/centers/registered voters.
Hotspot categorization (per barangay) with reasons.
Checkpoint operations (Joint COMELEC-AFP-PNP), deployed assets
(sea/air/land, stand-by, comms).
Election-related incidents (date, type, result) — this is the
live incident log the dashboard should foreground.
Election paraphernalia delivery (to treasurer's office, to polling
precincts) with % delivered.
ACM (Automated Counting Machine) testing/sealing status.
Voting start/close status, transmission status.
Municipal/provincial canvassing % and proclamation status.
The existing sheets are fragile (several columns already show `#REF!` /
`#DIV/0!` errors from broken formulas) — the new system must not
replicate spreadsheet-style formula chains; compute all derived values
(%, totals) in application code from raw stored numbers.
---
2. Problem statement (from stakeholder)
Sensitive operational data currently lives in uncontrolled Excel files.
No dashboard exists for tracking incidents on the ground or troop
deployment numbers in near-real-time.
No centralized database — every JTF keeps its own copy.
No way to see which areas to prioritize based on threat level.
3. MVP goals
Build a role-gated, single-database web application that:
Replaces the manual spreadsheets with structured data entry per JTF.
Shows command-level rollups (the "Recapitulation" views from the deck)
automatically computed, not manually tallied.
Visualizes hotspots/incidents geographically so leadership can see
where to prioritize.
Controls who can see and edit what (a JTF Zampelan user should not
necessarily edit JTF Central's data; only Command-level roles see
everything).
Keeps a full audit trail of every data change (who, what, when) —
this is command-sensitive data.
Out of scope for MVP (call these out explicitly, don't build them):
mobile app, offline sync, integration with COMELEC/PNP live systems,
predictive/ML threat scoring, automated slide-deck export. Note them as
"Phase 2" in the README but do not implement.
---
4. Tech stack
Use a stack that is easy to self-host on a private/intranet server
(assume no public internet exposure — this is sensitive data):
Frontend: Next.js (App Router) + React + TypeScript + Tailwind CSS
shadcn/ui for components + Recharts for charts.
Backend: Next.js API routes (or a small Express service if you
prefer separating concerns) + TypeScript.
Database: PostgreSQL + Prisma ORM (schema-first, migration-tracked).
Auth: NextAuth (credentials provider — no external OAuth dependency,
since this must run air-gapped/intranet) with a custom RBAC layer.
Mapping: a lightweight vector map (e.g., Leaflet with a static
Mindanao/BARMM GeoJSON, or a simple SVG choropleth if GeoJSON isn't
available) — do not depend on an external tile service if the
deployment target is air-gapped; make the map provider swappable.
Deployment: Docker Compose (app + Postgres) so it can run on a
single on-prem server with no cloud dependency.
`[CONFIRM]` Ask the user: will this run fully air-gapped/on-prem, or on
a private cloud VM with internet egress? This determines whether Leaflet
can use an online tile provider or needs offline tiles.
---
5. Data model (Prisma schema — implement this, adjust types as needed)
```prisma
enum Role {
  ADMIN            // full access, user management
  COMMAND          // WESMINCOM level, read all, no data entry
  JTF_COMMANDER     // read/write own JTF, read-only rollups of others
  JTF_STAFF         // data entry for own JTF only
  VIEWER            // read-only, scoped to one JTF or command-wide
}

enum ThreatCategory {
  CTG
  LTG
  CBC
}

enum NeutralizationType {
  CAPTURED
  KILLED
  APPREHENDED
  SURRENDERED
}

enum ForceStatus {
  PSR   // permanent/standing
  NPSR  // non-permanent/standing  (keep as literal enum from source data)
}

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role
  jtfId         String?  // null for ADMIN/COMMAND (all-JTF access)
  jtf           JTF?     @relation(fields: [jtfId], references: [id])
  createdAt     DateTime @default(now())
  auditLogs     AuditLog[]
}

model JTF {
  id           String   @id @default(cuid())
  name         String   @unique   // "JTF ZAMPELAN", "JTF ORION", ...
  areaOfOps    String?
  units        Unit[]
  deployments  TroopDeployment[]
  incidents    Incident[]
  accomplishments AccomplishmentRecord[]
  rido         RidoSettlement[]
}

model Unit {
  id        String @id @default(cuid())
  jtfId     String
  jtf       JTF    @relation(fields: [jtfId], references: [id])
  name      String   // e.g. "51IB", "MBLT4/54MC"
  brigade   String?
  province  String?
}

// --- Accomplishments domain (CTG / LTG / CBC) ---

model Indicator {
  id           String   @id @default(cuid())
  category     ThreatCategory
  name         String    // "Nr of neutralized personalities", "Nr of RPCs dismantled", ...
  subgroup     String?   // "DI Maute", "BIFF Bungos", "SRC5", "Platoon Uno", etc.
  targetYE     Int?      // target, year-end
  records      AccomplishmentRecord[]
}

model AccomplishmentRecord {
  id            String   @id @default(cuid())
  indicatorId   String
  indicator     Indicator @relation(fields: [indicatorId], references: [id])
  jtfId         String?
  jtf           JTF?     @relation(fields: [jtfId], references: [id])
  quarter       String   // "1Q 2026", "2Q 2026"
  neutralizationType NeutralizationType?
  forceStatus   ForceStatus?  // PSR / NPSR split
  count         Int
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model HviLogEntry {
  id          String   @id @default(cuid())
  category    ThreatCategory
  name        String     // "Anthony Jones NARVASA @NOMADS/MAGAW"
  role        String?    // "Secretary, FSMR"
  outcome     String     // "killed", "arrested", ...
  date        DateTime
  location    String?
  narrative   String
  createdAt   DateTime @default(now())
}

model RidoSettlement {
  id         String  @id @default(cuid())
  jtfId      String
  jtf        JTF     @relation(fields: [jtfId], references: [id])
  quarter    String
  involving  String  // "LLEs/PAGs" | "MNLF" | "MILF"
  count      Int
}

// --- BPE 2026 election-ops domain ---

model ElectionArea {
  id                String  @id @default(cuid())
  jtfId             String
  jtf               JTF     @relation(fields: [jtfId], references: [id])
  unitId            String?
  unit              Unit?   @relation(fields: [unitId], references: [id])
  region            String?
  province          String
  city              String?
  municipality      String?
  barangay          String?
  hotspotCategory   String?   // e.g. "Yellow", "Red", "Green" or source labels
  hotspotReason     String?
  numPrecincts      Int?
  numCenters        Int?
  registeredVoters  Int?
  lat               Float?
  lng               Float?
}

model TroopDeployment {
  id              String  @id @default(cuid())
  jtfId           String
  jtf             JTF     @relation(fields: [jtfId], references: [id])
  electionAreaId  String?
  electionArea    ElectionArea? @relation(fields: [electionAreaId], references: [id])
  unitLabel       String?          // "101BDE", "1101BDE", etc — matches deck's summary tables
  deployedToPolling Int  @default(0)
  qrf               Int  @default(0)
  afpOfficers       Int  @default(0)
  afpEnlisted       Int  @default(0)
  caa               Int  @default(0)
  wavsTav           Int  @default(0)
  pnpOfficers       Int  @default(0)
  pnpEnlisted       Int  @default(0)
  checkpointOps     Int  @default(0)
  reportedAt        DateTime @default(now())
}

model Incident {
  id              String   @id @default(cuid())
  jtfId           String
  jtf             JTF      @relation(fields: [jtfId], references: [id])
  electionAreaId  String?
  electionArea    ElectionArea? @relation(fields: [electionAreaId], references: [id])
  date            DateTime
  type            String
  result          String?
  createdById     String
  createdAt       DateTime @default(now())
}

model ElectionOpsStatus {
  id                    String  @id @default(cuid())
  electionAreaId        String  @unique
  electionArea          ElectionArea @relation(fields: [electionAreaId], references: [id])
  paraphTotalTreasurer   Int?
  paraphDeliveredTreasurer Int?
  paraphTotalPrecinct    Int?
  paraphDeliveredPrecinct Int?
  acmTestedSealed        Boolean @default(false)
  votingStarted          Boolean @default(false)
  votingClosed           Boolean @default(false)
  transmissionStatus     String?
  municipalCanvassPct    Float?
  municipalProclaimed    Boolean @default(false)
  provincialCanvassPct   Float?
  provincialProclaimed   Boolean @default(false)
  updatedAt              DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String    // "CREATE", "UPDATE", "DELETE"
  entity    String    // model name
  entityId  String
  diff      Json?
  createdAt DateTime @default(now())
}
```
Notes for implementation:
Compute all percentages (`% of Delivery`, canvassing %) in a service
layer / API response transform — never store a formula-derived
value as if it were raw input, and guard every division against
divide-by-zero (the source sheets show `#DIV/0!` all over — this is
exactly the bug class to eliminate).
`AccomplishmentRecord` and `RidoSettlement` should have a DB-level
uniqueness constraint on `(indicatorId, jtfId, quarter, forceStatus, neutralizationType)` to prevent duplicate quarterly entries.
---
6. RBAC rules
Role	Read scope	Write scope
ADMIN	everything	user management, all data
COMMAND	all JTFs, all domains	none (read-only)
JTF_COMMANDER	own JTF full detail, other JTFs rollup-only	own JTF
JTF_STAFF	own JTF	own JTF, own entries only for edit/delete
VIEWER	whatever scope assigned at account creation	none
Enforce scope at the API layer (never trust client-side filtering).
Every write goes through a single service function that also writes an
`AuditLog` row in the same transaction.
---
7. Screens (MVP)
Login — email/password, NextAuth credentials.
Overview / Command Dashboard
Total troops deployed vs. QRF (recapitulation card, matches deck's
"RECAPITULATION" slide) — total, per-JTF breakdown table + bar chart.
Accomplishments summary: CTG/LTG/CBC target-vs-actual, this
quarter, cumulative for the year — small multiples, one card per
threat category.
Recent incidents (last 10) with a "priority" flag (see §8).
Accomplishments — CTG / LTG / CBC (one page, tabs per category)
Indicator table: Target (YE) vs 1Q vs 2Q vs cumulative, split
PSR/NPSR where applicable — mirrors the deck tables exactly.
HVI Neutralized log (timeline list, most recent first).
Filter by JTF, by quarter.
BPE 2026 — Deployment
Per-JTF cards: total deployed / deployment-to-polling / QRF
(matches the deck's per-JTF slides).
Unit-level breakdown table (sortable, filterable by JTF/unit).
Recapitulation rollup (auto-computed sum, not manually entered).
Hotspot / Priority Map
Map of areas of operation, color-coded by `hotspotCategory` and/or
a computed priority score (see §8) — clicking an area shows
precinct count, registered voters, deployment, and open incidents.
Incidents Log
Full list/table, filterable by JTF, area, date range, type.
Create/edit form for JTF_STAFF/JTF_COMMANDER scoped to their JTF.
Election Ops Status
Per-area status: paraphernalia delivery %, ACM sealed, voting
started/closed, transmission, canvassing %, proclamation.
Admin
User management (ADMIN only): create user, assign role + JTF scope.
Audit log viewer (ADMIN/COMMAND, read-only, filterable).
---
8. "Areas to prioritize" logic (MVP heuristic — not ML)
Compute a simple, transparent priority score per `ElectionArea` (or
per area of operation for the threat-accomplishments side), e.g.:
```
priorityScore =
    (hotspotCategory weight: Red=3, Yellow=2, Green=1)
  + (open/recent incidents in area, last 30 days, weighted higher for
     more severe `type`)
  - (troops deployed relative to registered voters, normalized — more
     coverage lowers urgency)
```
Keep the formula in one clearly named, documented function
(`computePriorityScore`) so command staff can see and challenge the
logic — do not hide it inside a black-box model. Sort the map/dashboard
"Priority Areas" widget by this score, top 10.
---
9. Seed data
Seed the database with the seven indicator tables and totals visible
in the source deck (CTG accomplishments, LTG accomplishments, CBC/RIDO
settlement, BPE 2026 deployment by JTF) so the MVP is demoable
immediately without manual data entry. Use the numbers already present
in this conversation's source PDF as the seed values. Do not invent
additional named individuals or incidents beyond what's in the seed
source — leave those tables otherwise empty for real data entry.
---
10. Security / non-functional requirements
All data entry and viewing requires authentication; no anonymous routes.
Passwords hashed (bcrypt/argon2), never logged.
Every mutating action recorded in `AuditLog`.
`.env` for secrets, never committed; provide `.env.example`.
Provide a `docker-compose.yml` that stands up Postgres + the app for
local/on-prem deployment with a single command.
Add a `README.md` explaining: setup, seeding, default admin creation,
and an explicit "Phase 2 / Not built" section listing deferred items
from §3.
---
11. Build order (do this incrementally, don't try to do it all in one shot)
Scaffold Next.js + TS + Tailwind + shadcn/ui project structure.
Prisma schema (§5) + migration + seed script (§9).
Auth (NextAuth credentials) + RBAC middleware (§6).
API routes for each domain (accomplishments, deployments, incidents,
election-ops-status) with scope enforcement + audit logging.
Overview dashboard page (§7.2) wired to real seeded data.
Remaining pages (§7.3–7.7) in order.
Admin/user management (§7.8).
Docker Compose + README.
Confirm all division/percentage calculations are guarded (no
`#DIV/0!`-style bugs) and write a short test for `computePriorityScore`.
At each numbered step, stop, summarize what was built, and confirm
before moving to the next step.

---

## Deviations from this spec, and why

This section records where the implementation intentionally departs from
the text above, so the reasoning isn't lost.

- **No source deck/PDF was actually provided** in the session that built
  this project, despite §9 referring to "this conversation's source PDF."
  The seed script therefore creates structure only (JTFs, indicator
  taxonomy, default admin) with zero operational figures — see the README's
  "What's seeded vs. what isn't" section. Fabricating neutralization counts,
  firearms figures, or incident data for a real armed forces command would
  be actively harmful, not a shortcut.
- **RidoSettlement's unique constraint** is `(jtfId, quarter, involving)`,
  not the `(indicatorId, jtfId, quarter, forceStatus, neutralizationType)`
  tuple §5 specifies for both `AccomplishmentRecord` and `RidoSettlement` —
  RidoSettlement has no `indicatorId`, `forceStatus`, or `neutralizationType`
  fields in its own model definition just above that note, so the tuple as
  written doesn't apply to it. `AccomplishmentRecord` uses the exact tuple
  given.
- **Deployment: air-gapped**, confirmed with the user — the priority map has
  no online tile layer (see README § Mapping).
- **JTF_COMMANDER "rollup-only" access to other JTFs** (§6) is implemented
  as: aggregate/summary queries (deployment totals, accomplishment sums,
  RIDO settlement sums, priority-map scoring) are visible command-wide,
  while row-level detail (individual incidents, named HVI log entries) stays
  strictly scoped to their own JTF. See `canReadRollup` in `src/lib/rbac.ts`.

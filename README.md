# CAH Scheduler

A nurse scheduling application for Critical Access Hospitals (small rural hospitals, ≤25 beds). Automates staff schedule generation, enforces hard rules (safety/legal), and optimises for fairness and cost across three schedule variants.

**GitHub:** https://github.com/GrowthToDo/cah-scheduler

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| UI | React, Radix UI, Tailwind CSS |
| Database | SQLite via `better-sqlite3` (local file, no server required) |
| ORM | Drizzle ORM |
| Excel | xlsx |
| Testing | Vitest (202 tests) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Apply the database schema (creates cah-scheduler.db in project root)
npm run db:push

# Optional: seed with test data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are required — the SQLite database is a local file created automatically.

---

## Development Commands

```bash
npm run dev          # Start dev server (port 3000, hot reload)
npm run build        # db:push + db:seed + next build
npm start            # Production server
npm run lint         # ESLint

# Database
npm run db:push      # Apply schema changes to the SQLite file
npm run db:generate  # Generate Drizzle migration files
npm run db:studio    # Open Drizzle Studio (visual DB browser at localhost:4983)
npm run db:seed      # Load test data

# Tests
npm test             # Run all 202 Vitest tests once
npm run test:watch   # Watch mode
```

---

## Project Structure

```
src/
├── app/
│   ├── api/                # REST API routes
│   ├── schedule/[id]/      # Schedule grid + Generate Schedule button
│   ├── scenarios/          # Generate & compare 3 schedule variants
│   ├── staff/              # Staff management
│   ├── callouts/           # Callout logging & escalation
│   ├── leave/              # Leave approval workflow
│   ├── swaps/              # Shift swap management
│   ├── availability/       # PRN availability submissions
│   ├── rules/              # Rule configuration
│   ├── settings/           # Unit + holiday config
│   ├── audit/              # Audit trail
│   └── setup/              # Excel import/export
├── components/
│   ├── layout/sidebar.tsx  # Navigation
│   ├── schedule/           # Schedule grid, assignment dialog
│   └── ui/                 # Radix UI component wrappers
├── db/
│   ├── schema.ts           # Drizzle schema (source of truth)
│   ├── index.ts            # DB connection
│   └── seed.ts             # Test data
└── lib/
    ├── engine/
    │   ├── rule-engine.ts          # Schedule evaluation orchestrator
    │   ├── rules/                  # 20+ individual rule evaluators (pure functions)
    │   └── scheduler/              # Automated scheduling algorithm
    │       ├── types.ts            # WeightProfile, AssignmentDraft, etc.
    │       ├── state.ts            # SchedulerState (O(1) lookups)
    │       ├── eligibility.ts      # 8 hard rule checks
    │       ├── scoring.ts          # Soft penalty scoring
    │       ├── greedy.ts           # Phase 1: greedy construction
    │       ├── local-search.ts     # Phase 2: swap improvement
    │       ├── weight-profiles.ts  # BALANCED / FAIR / COST_OPTIMIZED
    │       ├── index.ts            # Entry point
    │       └── runner.ts           # Background job orchestrator
    ├── audit/logger.ts
    ├── callout/escalation.ts
    ├── coverage/find-candidates.ts
    └── import/parse-excel.ts

src/__tests__/
├── rules/           # Tests for each rule evaluator
└── scheduler/       # Tests for scheduling algorithm (94 tests)

docs/                # User-facing guides (non-technical, plain English)
RULES_SPECIFICATION.md   # Full business rules reference (v1.3.0)
CHANGELOG.md             # Version history
```

---

## Key Features

### Automated Schedule Generation

Click **Generate Schedule** on any schedule page. The system runs three variants in the background:

| Variant | Priority |
|---------|----------|
| **Balanced** | Equal weight across all objectives — applied automatically |
| **Fairness-Optimized** | Weekend/holiday equity, preference matching |
| **Cost-Optimized** | Minimise overtime and float/agency use |

Each variant uses a **greedy construction + local search** algorithm that:
- Never violates hard rules (rest hours, competency requirements, approved leave, etc.)
- Scores candidates using soft rule penalties with different weight profiles
- Documents every understaffed shift with rejection reasons for manager review

After generation, compare the three variants on the **Scenarios** page and click **Apply** to switch the active schedule.

### Hard Rules (Never Violated)

Rest hours, max consecutive days, ICU competency, no overlapping shifts, PRN availability, approved leave blocking, 60h rolling window, on-call limits.

### Soft Rules (Scored with Penalties)

Overtime, shift preference matching, weekend fairness, consecutive weekends, holiday fairness, skill mix, float penalty, charge clustering.

See [`RULES_SPECIFICATION.md`](./RULES_SPECIFICATION.md) for the full specification.

---

## Database

The app uses a **local SQLite file** (`cah-scheduler.db` in the project root). No database server, no environment variables needed.

After any schema change:
1. Edit `src/db/schema.ts`
2. Run `npm run db:push`

---

## Testing

```bash
npm test
```

202 tests, all pure-function (no database required for tests):
- `src/__tests__/rules/` — 108 tests for all 21 scheduling rules
- `src/__tests__/scheduler/` — 94 tests for the scheduling algorithm (state, eligibility, scoring, greedy, local search)

---

## Documentation

| Document | Audience |
|----------|----------|
| `docs/` (01–10) | Non-technical users (nurse managers, staff) |
| `RULES_SPECIFICATION.md` | Business stakeholders, technical reference |
| `CHANGELOG.md` | Developers, version history |
| `CLAUDE.md` | AI development assistant context |

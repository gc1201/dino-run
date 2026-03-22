# Arnold Sprint Tracker — Project Brief

**Owner:** Ivy Cao · Terner Labs
**Status:** In Development
**Last Updated:** March 2026

---

## What It Is

A multi-jurisdiction sprint race tracker styled as a Chrome Dinosaur game. Team members are represented as pixel-art dino sprites racing across a Gantt-style track divided by project phase. A pterodactyl represents a "hopper" — a team member who assists across multiple tracks in parallel.

The app is built to track a single, time-boxed multi-city project (Arnold Sprint) with five jurisdictions running the same workflow on independent timelines.

---

## The Problem It Solves

Managing parallel workstreams across five cities in a spreadsheet loses two things: **at-a-glance progress** and **team energy**. A shared Gantt chart shows where everyone is, but doesn't communicate urgency or momentum. This tracker makes sprint status something people actually want to open.

---

## Team

| Name    | Role    | Jurisdiction(s)         |
|---------|---------|-------------------------|
| Ivy     | Runner  | Durham, Charlottesville |
| Megan   | Runner  | Raleigh                 |
| Darrell | Runner  | Flagstaff               |
| Arian   | Runner  | AZ city TBD             |
| Haley   | Hopper  | Durham, Flagstaff       |
| Sarah   | Hopper  | Raleigh, AZ city TBD   |

---

## Jurisdictions

| City             | Runner  | Hopper | Notes               |
|------------------|---------|--------|---------------------|
| Durham           | Ivy     | Haley  |                     |
| Raleigh          | Megan   | Sarah  |                     |
| Flagstaff        | Darrell | Haley  |                     |
| Charlottesville  | Ivy     | —      |                     |
| AZ city TBD      | TBD     | Sarah  | Runner unconfirmed  |

---

## Phase Structure

Each jurisdiction runs the same seven phases, split into two parallel strips:

**A-Roll** (runner's sequential work)

| Phase       | Default Duration | Color    |
|-------------|-----------------|----------|
| Parcel      | 5 weekdays      | Blue     |
| Assumptions | 4 weekdays      | Amber    |
| Policy      | 5 weekdays      | Pink     |
| Integration | 4 weekdays      | Cyan     |
| Rollout     | 4 weekdays      | Orange   |

**B-Roll** (hopper's parallel work)

| Phase       | Default Duration | Color    |
|-------------|-----------------|----------|
| Land Value  | 2 weekdays      | Green    |
| Fees        | 5 weekdays      | Red      |

Default timeline starts **March 10, 2026** and spans ~5 weeks.

---

## How the Animation Works

1. On page load, everyone waits at the **start line**
2. Press **Space** (or click) → race begins, sprites lerp toward their real positions
3. **Runner position** is computed linearly from A-roll phase status: `done` phases advance to their end date, `in_progress` clamps to today, `not_started` stops progress
4. **Hopper position** follows the same logic on B-roll phases independently
5. Phase boundaries are marked with **pixel cacti**; the last phase ends with a **checkered finish flag**
6. A **"?" dino** renders in grey for the unconfirmed AZ runner

---

## Tech Stack

| Layer    | Choice              | Rationale                                           |
|----------|---------------------|-----------------------------------------------------|
| Frontend | Next.js 15          | App Router, Vercel-native, largest ecosystem        |
| Database | Supabase (Postgres) | Free hosted Postgres, SQL dashboard, real-time ready|
| ORM      | Drizzle             | Type-safe schema, migrations as TypeScript          |
| Deploy   | Vercel              | GitHub push → live in 30 seconds                    |

### Key Architecture Decision

`public/sprint_tracker.html` is **dual-mode**:
- Opened directly → uses `localStorage` with a built-in edit panel (fully offline, no server needed)
- Embedded in Next.js → reads `window.__SPRINT_STATE__` injected by the server with live Supabase data

This means the HTML file works as both a **standalone shareable snapshot** and the **live app's animation engine** — no duplication.

---

## Data Model

```
members  (id, name, color, role, sort_order)
    ↓
tracks   (id, jurisdiction, main_runner_id, hopper_member_id, hopper_phase_name, sort_order)
    ↓
phases   (id, track_id, name, color, start, duration, status, roll, sort_order, updated_at)
```

Phase `duration` is stored in **weekdays** (skips Saturday/Sunday). End date is always computed — never stored — keeping the model clean and preventing inconsistent states.

---

## Editing Flow

1. Open the app → sidebar shows all tracks and phases
2. Edit `start date`, `duration (days)`, or `status` inline
3. Hit **SAVE** → `PATCH /api/phases/[id]` → Supabase updates → page refreshes with new data → race resets to start line with updated positions

---

## Setup in 5 Steps

```bash
# 1. Install
npm install

# 2. Create Supabase project → copy connection strings
cp .env.example .env.local && vim .env.local

# 3. Push schema
npm run db:generate && npm run db:migrate

# 4. Seed default Arnold Sprint data
npm run db:seed

# 5. Run
npm run dev
```

Deploy: push to GitHub → connect repo in Vercel → add `DATABASE_URL` env var → done.

---

## Planned Next Steps

- [ ] **Supabase Realtime** — subscribe to phase changes so the race updates live when a teammate marks a phase done, without refreshing
- [ ] **Multiple sprint cycles** — add a `sprints` table; link tracks to a sprint so Arnold Sprint becomes the first of many
- [ ] **Supabase Auth** — each team member logs in and can only edit their own tracks
- [ ] **Mobile view** — simplified progress bars for quick status checks on the go
- [ ] **Export** — one-click PNG/PDF snapshot of the current race state for stakeholder updates

---

## Files at a Glance

```
arnold-sprint/
├── app/page.tsx                  ← fetches DB, passes state to components
├── app/api/phases/[id]/route.ts  ← PATCH endpoint
├── components/SprintRace.tsx     ← injects state into iframe animation
├── components/EditPanel.tsx      ← sidebar edit UI
├── db/schema.ts                  ← Drizzle table definitions
├── db/seed.ts                    ← default Arnold Sprint data
├── lib/queries.ts                ← all DB queries
├── lib/state.ts                  ← DB rows → animation state shape
└── public/sprint_tracker.html   ← dual-mode canvas animation
```

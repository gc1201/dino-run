# Arnold Sprint Tracker — Project Brief

**Owner:** Ivy Cao · Terner Labs
**Status:** In Development
**Last Updated:** March 2026

---

## What It Is

A multi-jurisdiction sprint race tracker styled as a Chrome Dinosaur game. Team members are represented as pixel-art dino sprites racing across a Gantt-style track divided by project phase. Pterodactyls represent "hoppers" — team members who assist across multiple tracks on B-roll phases in parallel. Hoppers only appear on screen when their assigned phase is actively in progress.

The app tracks a single, time-boxed multi-city project (Arnold Sprint) with four jurisdictions running the same workflow on independent timelines.

---

## The Problem It Solves

Managing parallel workstreams across multiple cities in a spreadsheet loses two things: **at-a-glance progress** and **team energy**. A shared Gantt chart shows where everyone is, but doesn't communicate urgency or momentum. This tracker makes sprint status something people actually want to open.

---

## Team

| Name    | Role    | Jurisdiction(s)         |
|---------|---------|-------------------------|
| Ivy     | Runner  | Durham, Charlottesville |
| Megan   | Runner  | Raleigh                 |
| Darrell | Runner  | Flagstaff               |
| Arian   | Runner  | (available)             |
| Haley   | Hopper  | Durham, Flagstaff       |
| Sarah   | Hopper  | Durham, Raleigh         |

---

## Jurisdictions

| City             | Runner  | Hopper 1 | Hopper 2 | Notes |
|------------------|---------|----------|----------|-------|
| Durham           | Ivy     | Haley (Land Value) | Sarah (Fees) | |
| Raleigh          | Megan   | Sarah (Land Value) | — | |
| Flagstaff        | Darrell | Haley (Fees) | — | |
| Charlottesville  | Ivy     | —        | —        | |

Jurisdictions can be added or removed dynamically from the sidebar.

---

## Phase Structure

Each jurisdiction runs the same seven phases, split into two parallel strips:

**A-Roll** (runner's sequential work)

| Phase       | Default Duration | Color    |
|-------------|-----------------|----------|
| Parcel      | 9 weekdays      | Blue     |
| Assumptions | 4 weekdays      | Amber    |
| Policy      | 5 weekdays      | Pink     |
| Integration | 4 weekdays      | Cyan     |
| Rollout     | 4 weekdays      | Orange   |

**B-Roll** (hopper's parallel work)

| Phase       | Default Duration | Color    |
|-------------|-----------------|----------|
| Land Value  | 2 weekdays      | Green    |
| Fees        | 5 weekdays      | Red      |

Default timeline starts **March 10, 2026** and spans ~6 weeks.

---

## How the Animation Works

1. On page load, everyone waits at the **start line**
2. Press **Space** (or click) → race begins, sprites lerp toward their real positions
3. **Runner position** (T-Rex) is computed linearly from A-roll phase status: `done` phases advance to their end date, `in_progress` clamps to today, `not_started` stops progress
4. **Hopper position** (Pterodactyl) follows the same logic on B-roll phases — **only visible when their assigned phase is in progress**; hidden when not started or done
5. Phase boundaries are marked with **pixel cacti**; the last A-roll phase ends with a **checkered finish flag**
6. **B-roll strips above A-roll strips**, both rendered at the bottom of each lane as timeline indicators
7. Each track lane has a **bordered background** with a runner-colored left accent for visual bundling

---

## Editing Flow

1. Open the app → **sidebar** shows all tracks with their phases
2. Assign a **runner** to each track from a dropdown
3. Assign up to **2 hoppers** per track, each linked to a specific B-roll phase
4. Set **due dates** per phase (start dates are back-computed from due date and duration)
5. Toggle phase **A/B roll**, change **duration** or **status** inline
6. Set a **timeline start** per track — changing it shifts all phases by the delta
7. **Add/delete jurisdictions** from the sidebar
8. Hit **SAVE** → API updates Supabase → page refreshes → race resets with updated positions

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
- Embedded in Next.js → reads `window.__SPRINT_STATE__` injected by the server with live Supabase data; HTML edit button is hidden (editing done via React sidebar)

This means the HTML file works as both a **standalone shareable snapshot** and the **live app's animation engine** — no duplication.

---

## Data Model

```
members  (id, name, color, role, sort_order)
    ↓
tracks   (id, jurisdiction, main_runner_id,
          hopper_member_id, hopper_phase_name,
          hopper2_member_id, hopper2_phase_name,
          timeline_start, sort_order)
    ↓
phases   (id, track_id, name, color, start, duration, status, roll, sort_order, updated_at)
```

- **Two hoppers per track** — each assigned to a specific B-roll phase by name
- **Timeline start** — per-track date; changing it shifts all phase start dates
- Phase `duration` is stored in **weekdays** (skips Saturday/Sunday). End date is always computed — never stored — keeping the model clean and preventing inconsistent states.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/phases/[id]` | Update phase start, duration, status, roll |
| POST | `/api/tracks` | Create new jurisdiction with default phases |
| PATCH | `/api/tracks/[id]` | Update track fields (runner, hoppers, timeline start) |
| DELETE | `/api/tracks/[id]` | Delete jurisdiction and all its phases (cascade) |

---

## Setup in 5 Steps

```bash
# 1. Install
npm install

# 2. Create Supabase project → copy connection string
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
├── app/page.tsx                     ← fetches DB, renders sidebar + animation
├── app/api/phases/[id]/route.ts     ← PATCH endpoint for phases
├── app/api/tracks/route.ts          ← POST endpoint to create tracks
├── app/api/tracks/[id]/route.ts     ← PATCH/DELETE endpoints for tracks
├── components/SprintRace.tsx        ← injects state into iframe animation
├── components/EditPanel.tsx         ← sidebar edit UI (DB-connected)
├── db/schema.ts                     ← Drizzle table definitions
├── db/seed.ts                       ← default Arnold Sprint data
├── db/migrations/                   ← SQL migration files
├── lib/queries.ts                   ← all DB queries + track CRUD
├── lib/state.ts                     ← DB rows → animation state shape
└── public/sprint_tracker.html       ← dual-mode canvas animation
```

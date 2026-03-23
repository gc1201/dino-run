# 🦖 Arnold Sprint Tracker

A multi-jurisdiction sprint race tracker with a Chrome Dinosaur game aesthetic.
Watch your team race across project phases in real time.

## Stack

| Layer    | Choice              | Why                                      |
|----------|---------------------|------------------------------------------|
| Frontend | Next.js 15          | App Router, Vercel-native                |
| Database | Supabase (Postgres) | Free tier, SQL dashboard, real-time ready|
| ORM      | Drizzle             | Type-safe schema, migrations as code     |
| Deploy   | Vercel              | Push → live in 30 seconds                |

## Project Structure

```
arnold-sprint/
├── app/
│   ├── page.tsx                     ← Server Component: fetches DB, renders full-screen layout
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── phases/[id]/route.ts     ← PATCH: update phase start/duration/status/roll
│       └── tracks/
│           ├── route.ts             ← POST: create new jurisdiction track
│           └── [id]/route.ts        ← PATCH: update track fields; DELETE: remove track
├── components/
│   ├── SprintRace.tsx               ← Embeds canvas animation via iframe srcdoc
│   └── EditPanel.tsx                ← Sidebar edit UI (DB-connected), due date editing
├── db/
│   ├── schema.ts                    ← Drizzle table definitions (members/tracks/phases)
│   ├── index.ts                     ← Postgres connection singleton
│   ├── seed.ts                      ← One-time seed with default Arnold Sprint data
│   └── migrations/                  ← SQL migration files
├── lib/
│   ├── queries.ts                   ← All DB queries (reads + writes + track CRUD)
│   └── state.ts                     ← DB rows → JS animation state shape
└── public/
    └── sprint_tracker.html          ← Dual-mode: standalone (localStorage) or embedded (Supabase)
```

## Features

- **Per-jurisdiction tracks** with assigned runners and up to 2 hoppers each
- **A-roll / B-roll phases** — runners work A-roll sequentially, hoppers assist on B-roll in parallel
- **Due date editing** — set expected due dates per phase; start dates are back-computed from duration
- **Phase roll toggle** — switch any phase between A and B roll
- **Track-level timeline start** — shift all phases for a jurisdiction by changing one date
- **Add/delete jurisdictions** — dynamically manage tracks via the sidebar
- **Runner assignment** — assign any runner member to a track from the sidebar
- **Smart hopper visibility** — pterodactyl sprites only appear when their assigned B-roll phase is in progress
- **Chrome T-Rex sprites** — pixel-art dinos (runners) and pterodactyls (hoppers) race across the track
- **B-roll stacked above A-roll** — phase timeline strips at the bottom of each lane
- **Visual track bundling** — each jurisdiction lane has a bordered background with runner-colored accent

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Copy the connection URL

```bash
cp .env.example .env.local
# Fill in DATABASE_URL
```

### 3. Run migrations
```bash
npm run db:generate   # generate SQL from schema.ts
npm run db:migrate    # apply to Supabase
```

### 4. Seed default data
```bash
npm run db:seed
```

### 5. Start the dev server
```bash
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# DATABASE_URL  →  Supabase connection URL
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys on push.

## How It Works

1. **Server Component** (`app/page.tsx`) fetches all sprint data from Supabase on each request
2. **EditPanel** sidebar lets you edit due dates, durations, statuses, rolls, runner/hopper assignments, and manage jurisdictions — all persisted to Supabase via API routes
3. **SprintRace** receives the state, fetches `/sprint_tracker.html`, injects `window.__SPRINT_STATE__`, and renders it in an iframe
4. On save → `router.refresh()` → animation reloads with fresh data, race resets to start line
5. **Standalone mode**: open `public/sprint_tracker.html` directly — falls back to localStorage with its own built-in edit panel

## Database Schema

```
members  (id, name, color, role, sort_order)
tracks   (id, jurisdiction, main_runner_id,
          hopper_member_id, hopper_phase_name,
          hopper2_member_id, hopper2_phase_name,
          timeline_start, sort_order)
phases   (id, track_id, name, color, start, duration, status, roll, sort_order, updated_at)
```

- **Two hoppers per track** — `hopper_member_id` + `hopper2_member_id` each linked to a B-roll phase name
- **Timeline start** — per-track date; changing it shifts all phase start dates by the delta
- **Duration** in weekdays (skips Sat/Sun); end date is always computed, never stored

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/phases/[id]` | Update phase start, duration, status, roll |
| POST | `/api/tracks` | Create new jurisdiction with default phases |
| PATCH | `/api/tracks/[id]` | Update track fields (runner, hoppers, timeline start) |
| DELETE | `/api/tracks/[id]` | Delete jurisdiction and all its phases |

## Default Phase Structure

Each jurisdiction runs seven phases in two parallel strips:

**A-Roll** (runner's sequential work)

| Phase       | Duration   | Color  |
|-------------|------------|--------|
| Parcel      | 9 weekdays | Blue   |
| Assumptions | 4 weekdays | Amber  |
| Policy      | 5 weekdays | Pink   |
| Integration | 4 weekdays | Cyan   |
| Rollout     | 4 weekdays | Orange |

**B-Roll** (hopper's parallel work)

| Phase       | Duration   | Color  |
|-------------|------------|--------|
| Land Value  | 2 weekdays | Green  |
| Fees        | 5 weekdays | Red    |

## Standalone Mode

`public/sprint_tracker.html` works independently without any server:
- Open it directly in a browser
- Uses localStorage for persistence
- Has its own built-in edit panel (hidden when embedded in Next.js)

Useful for sharing a snapshot or running offline.

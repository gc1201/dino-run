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
│   ├── page.tsx                  ← Server Component: fetches DB, renders layout
│   ├── layout.tsx
│   ├── globals.css
│   └── api/phases/[id]/route.ts  ← PATCH: update phase start/duration/status
├── components/
│   ├── SprintRace.tsx            ← Embeds canvas animation via iframe srcdoc
│   └── EditPanel.tsx             ← Sidebar edit UI, calls API on save
├── db/
│   ├── schema.ts                 ← Drizzle table definitions (members/tracks/phases)
│   ├── index.ts                  ← Postgres connection singleton
│   └── seed.ts                   ← One-time seed with default Arnold Sprint data
├── lib/
│   ├── queries.ts                ← All DB queries (reads + writes)
│   └── state.ts                  ← DB rows → JS animation state shape
└── public/
    └── sprint_tracker.html       ← Dual-mode: standalone (localStorage) or embedded (Supabase)
```

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Copy the **Transaction** (port 6543) and **Direct** (port 5432) URLs

```bash
cp .env.example .env.local
# Fill in DATABASE_URL and DATABASE_URL_DIRECT
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
# DATABASE_URL  →  Supabase Transaction URL (port 6543)
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys on push.

## How It Works

1. **Server Component** (`app/page.tsx`) fetches all sprint data from Supabase on each request
2. **SprintRace** component receives the state, fetches `/sprint_tracker.html`, injects `window.__SPRINT_STATE__`, and renders it in an iframe
3. **EditPanel** lets you edit phase start/duration/status → `PATCH /api/phases/[id]` → `router.refresh()` → animation reloads with fresh data, race resets to start line
4. **Standalone mode**: open `public/sprint_tracker.html` directly — falls back to localStorage with the built-in edit panel

## Database Schema (prepared for growth)

```
members  (id, name, color, role, sort_order)
tracks   (id, jurisdiction, main_runner_id, hopper_member_id, hopper_phase_name, sort_order)
phases   (id, track_id, name, color, start, duration, status, roll, sort_order, updated_at)
```

**Next steps for scale:**
- Add a `sprints` table → link tracks to sprint cycles (Arnold Sprint → Q2 Sprint → …)
- Add Supabase Realtime subscriptions → watch the race update live as team marks progress
- Add Supabase Auth → each team member logs in and edits their own track

## Standalone Mode

`public/sprint_tracker.html` works independently without any server:
- Open it directly in a browser
- Uses localStorage for persistence
- Has its own built-in edit panel

Useful for sharing a snapshot or running offline.

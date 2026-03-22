/**
 * One-time seed: push default Arnold Sprint data into Supabase.
 *
 * Run with:  npm run db:seed
 *
 * Safe to re-run — clears existing rows first.
 */

import "dotenv/config";
import { db } from "./index";
import { members, phases, tracks } from "./schema";

// ── Default data (mirrors the HTML defaults) ──────────────────────────────────

const DEFAULT_MEMBERS = [
  { name: "Ivy",     color: "#EC4899", role: "runner", sortOrder: 0 },
  { name: "Megan",   color: "#818CF8", role: "runner", sortOrder: 1 },
  { name: "Darrell", color: "#2DD4BF", role: "runner", sortOrder: 2 },
  { name: "Arian",   color: "#FB923C", role: "runner", sortOrder: 3 },
  { name: "Haley",   color: "#F87171", role: "hopper", sortOrder: 4 },
  { name: "Sarah",   color: "#A3E635", role: "hopper", sortOrder: 5 },
] as const;

const DEFAULT_PHASES = [
  { name: "Parcel",      color: "#3B82F6", start: "2026-03-10", duration: 5, roll: "A", sortOrder: 0 },
  { name: "Land Value",  color: "#10B981", start: "2026-03-10", duration: 2, roll: "B", sortOrder: 1 },
  { name: "Assumptions", color: "#F59E0B", start: "2026-03-17", duration: 4, roll: "A", sortOrder: 2 },
  { name: "Policy",      color: "#EC4899", start: "2026-03-24", duration: 5, roll: "A", sortOrder: 3 },
  { name: "Fees",        color: "#EF4444", start: "2026-03-24", duration: 5, roll: "B", sortOrder: 4 },
  { name: "Integration", color: "#06B6D4", start: "2026-03-31", duration: 4, roll: "A", sortOrder: 5 },
  { name: "Rollout",     color: "#F97316", start: "2026-04-07", duration: 4, roll: "A", sortOrder: 6 },
] as const;

const DEFAULT_TRACKS = [
  { jurisdiction: "Durham",         runnerIdx: 0, hopperIdx: 4, hopperPhase: "Land Value", sortOrder: 0 },
  { jurisdiction: "Raleigh",        runnerIdx: 1, hopperIdx: 5, hopperPhase: "Land Value", sortOrder: 1 },
  { jurisdiction: "Flagstaff",      runnerIdx: 2, hopperIdx: 4, hopperPhase: "Fees",        sortOrder: 2 },
  { jurisdiction: "Charlottesville",runnerIdx: 0, hopperIdx: null, hopperPhase: null,       sortOrder: 3 },
  { jurisdiction: "AZ city tbd",    runnerIdx: null, hopperIdx: 5, hopperPhase: "Fees",     sortOrder: 4 },
] as const;

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database…");

  // Clear in dependency order
  await db.delete(phases);
  await db.delete(tracks);
  await db.delete(members);
  console.log("  ✓ cleared existing rows");

  // Members
  const insertedMembers = await db
    .insert(members)
    .values(DEFAULT_MEMBERS.map((m) => ({ ...m, role: m.role })))
    .returning();
  console.log(`  ✓ inserted ${insertedMembers.length} members`);

  // Tracks + phases
  for (const t of DEFAULT_TRACKS) {
    const runner = t.runnerIdx !== null ? insertedMembers[t.runnerIdx] : null;
    const hopper = t.hopperIdx !== null ? insertedMembers[t.hopperIdx] : null;

    const [track] = await db
      .insert(tracks)
      .values({
        jurisdiction:    t.jurisdiction,
        mainRunnerId:    runner?.id ?? null,
        hopperMemberId:  hopper?.id ?? null,
        hopperPhaseName: t.hopperPhase ?? null,
        sortOrder:       t.sortOrder,
      })
      .returning();

    const phaseValues = DEFAULT_PHASES.map((p) => ({
      trackId:   track.id,
      name:      p.name,
      color:     p.color,
      start:     p.start,
      duration:  p.duration,
      status:    "not_started" as const,
      roll:      p.roll,
      sortOrder: p.sortOrder,
    }));

    // Charlottesville: Parcel is in_progress
    if (t.jurisdiction === "Charlottesville") {
      phaseValues[0].status = "in_progress";
    }

    await db.insert(phases).values(phaseValues);
    console.log(`  ✓ ${t.jurisdiction} (${phaseValues.length} phases)`);
  }

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});

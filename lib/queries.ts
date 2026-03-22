/**
 * All database queries live here — keeps components and API routes clean.
 * Uses Drizzle's relational query builder for type-safe joins.
 */

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, phases, tracks } from "@/db/schema";

// ── Read ──────────────────────────────────────────────────────────────────────

/** Fetch all members ordered by sortOrder. */
export async function getMembers() {
  return db.select().from(members).orderBy(asc(members.sortOrder));
}

/**
 * Fetch all tracks with their phases and member references.
 * Returns the raw rows; use buildAnimationState() to shape for the animation.
 */
export async function getTracksWithPhases() {
  const allTracks = await db
    .select()
    .from(tracks)
    .orderBy(asc(tracks.sortOrder));

  const allPhases = await db
    .select()
    .from(phases)
    .orderBy(asc(phases.sortOrder));

  // Group phases by trackId
  const phasesByTrack = allPhases.reduce<Record<number, typeof allPhases>>(
    (acc, p) => {
      (acc[p.trackId] ??= []).push(p);
      return acc;
    },
    {}
  );

  return allTracks.map((t) => ({
    ...t,
    phases: phasesByTrack[t.id] ?? [],
  }));
}

// ── Write ─────────────────────────────────────────────────────────────────────

export type PhaseUpdate = Partial<{
  start: string;
  duration: number;
  status: string;
}>;

/** Patch a single phase. Returns the updated row. */
export async function updatePhase(id: number, data: PhaseUpdate) {
  const [updated] = await db
    .update(phases)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(phases.id, id))
    .returning();
  return updated;
}

/** Update a track's jurisdiction name. */
export async function updateJurisdiction(id: number, name: string) {
  const [updated] = await db
    .update(tracks)
    .set({ jurisdiction: name })
    .where(eq(tracks.id, id))
    .returning();
  return updated;
}

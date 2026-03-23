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
  roll: string;
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

// ── Track CRUD ───────────────────────────────────────────────────────────────

export type TrackUpdate = Partial<{
  jurisdiction: string;
  mainRunnerId: number | null;
  hopperMemberId: number | null;
  hopperPhaseName: string | null;
  hopper2MemberId: number | null;
  hopper2PhaseName: string | null;
  timelineStart: string | null;
  sortOrder: number;
}>;

/** Update a track's fields. */
export async function updateTrack(id: number, data: TrackUpdate) {
  const [updated] = await db
    .update(tracks)
    .set(data)
    .where(eq(tracks.id, id))
    .returning();
  return updated;
}

const DEFAULT_PHASES = [
  { name: "Parcel",      color: "#3B82F6", offsetDays: 0,  duration: 9, roll: "A", sortOrder: 0 },
  { name: "Land Value",  color: "#10B981", offsetDays: 0,  duration: 2, roll: "B", sortOrder: 1 },
  { name: "Assumptions", color: "#F59E0B", offsetDays: 9,  duration: 4, roll: "A", sortOrder: 2 },
  { name: "Policy",      color: "#EC4899", offsetDays: 13, duration: 5, roll: "A", sortOrder: 3 },
  { name: "Fees",        color: "#EF4444", offsetDays: 13, duration: 5, roll: "B", sortOrder: 4 },
  { name: "Integration", color: "#06B6D4", offsetDays: 18, duration: 4, roll: "A", sortOrder: 5 },
  { name: "Rollout",     color: "#F97316", offsetDays: 22, duration: 4, roll: "A", sortOrder: 6 },
];

/** Add weekdays to a date string. */
function addWeekdays(dateStr: string, n: number): string {
  if (n <= 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d.toISOString().slice(0, 10);
}

/** Create a new track with default phases. */
export async function createTrack(jurisdiction: string, startDate: string) {
  const maxSort = await db.select().from(tracks).orderBy(asc(tracks.sortOrder));
  const nextSort = maxSort.length > 0 ? Math.max(...maxSort.map(t => t.sortOrder)) + 1 : 0;

  const [track] = await db
    .insert(tracks)
    .values({ jurisdiction, sortOrder: nextSort })
    .returning();

  const phaseValues = DEFAULT_PHASES.map((p) => ({
    trackId: track.id,
    name: p.name,
    color: p.color,
    start: addWeekdays(startDate, p.offsetDays),
    duration: p.duration,
    status: "not_started" as const,
    roll: p.roll,
    sortOrder: p.sortOrder,
  }));

  await db.insert(phases).values(phaseValues);
  return track;
}

/** Delete a track (phases cascade via FK). */
export async function deleteTrack(id: number) {
  await db.delete(tracks).where(eq(tracks.id, id));
}

/** Shift all phase start dates for a track by a weekday delta. */
export async function shiftTrackPhases(
  trackId: number,
  oldStart: string,
  newStart: string
) {
  const trackPhases = await db
    .select()
    .from(phases)
    .where(eq(phases.trackId, trackId));

  // Compute weekday delta between old and new start
  const oldDate = new Date(oldStart + "T12:00:00");
  const newDate = new Date(newStart + "T12:00:00");
  const forward = newDate.getTime() >= oldDate.getTime();
  const calendarDays = Math.round(
    Math.abs(newDate.getTime() - oldDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  for (const phase of trackPhases) {
    const phaseDate = new Date(phase.start + "T12:00:00");
    if (forward) {
      phaseDate.setDate(phaseDate.getDate() + calendarDays);
    } else {
      phaseDate.setDate(phaseDate.getDate() - calendarDays);
    }
    const newPhaseStart = phaseDate.toISOString().slice(0, 10);
    await db
      .update(phases)
      .set({ start: newPhaseStart, updatedAt: new Date() })
      .where(eq(phases.id, phase.id));
  }
}

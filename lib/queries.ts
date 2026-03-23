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

// ── Minimum durations per phase name ─────────────────────────────────────────

const MIN_DURATIONS: Record<string, number> = {
  Parcel: 9,
  "Land Value": 2,
  Assumptions: 4,
  Policy: 5,
  Fees: 5,
  Integration: 4,
  Rollout: 4,
};

const DEFAULT_MIN_DURATION = 3;

function getMinDuration(phaseName: string): number {
  return MIN_DURATIONS[phaseName] ?? DEFAULT_MIN_DURATION;
}

// ── Date utilities ───────────────────────────────────────────────────────────

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

/** Subtract weekdays from a date string. */
function subtractWeekdays(dateStr: string, n: number): string {
  if (n <= 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d.toISOString().slice(0, 10);
}

/** Compute end date: start + (duration - 1) weekdays. */
function phaseEnd(start: string, duration: number): string {
  if (duration <= 1) return start;
  return addWeekdays(start, duration - 1);
}

/** Count weekdays between two dates (inclusive of both). */
function countWeekdays(startStr: string, endStr: string): number {
  const s = new Date(startStr + "T12:00:00");
  const e = new Date(endStr + "T12:00:00");
  if (e < s) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(1, count);
}

/**
 * Set a phase's due date with auto-chaining.
 *
 * Logic:
 *   1. Find the previous phase in the same roll (same track, lower sortOrder)
 *   2. start = next weekday after previous phase ends (or keep current start if first)
 *   3. duration = weekdays(start, dueDate), clamped to >= minDuration
 *   4. If dueDate is too close, extend it to start + minDuration
 *
 * Returns the updated phase.
 */
export interface DueDateResult {
  updated: typeof phases.$inferSelect;
  adjusted: boolean;        // true if due date was clamped to min duration
  actualDueDate: string;    // the real end date after adjustment
  chainedCount: number;     // number of subsequent phases shifted
}

export async function setPhaseByDueDate(
  phaseId: number,
  dueDate: string
): Promise<DueDateResult> {
  const [phase] = await db.select().from(phases).where(eq(phases.id, phaseId));
  if (!phase) throw new Error("Phase not found");

  const minDur = getMinDuration(phase.name);

  // B-roll phases are independent — no chaining, just back-compute start from due date
  if (phase.roll === "B") {
    const span = countWeekdays(
      subtractWeekdays(dueDate, Math.max(minDur, 1) - 1),
      dueDate
    );
    const duration = Math.max(minDur, span);
    const start = subtractWeekdays(dueDate, duration - 1);
    const actualEnd = phaseEnd(start, duration);

    const [updated] = await db
      .update(phases)
      .set({ start, duration, updatedAt: new Date() })
      .where(eq(phases.id, phaseId))
      .returning();

    return { updated, adjusted: false, actualDueDate: actualEnd, chainedCount: 0 };
  }

  // A-roll phases: auto-chain from previous phase
  const siblings = await db
    .select()
    .from(phases)
    .where(eq(phases.trackId, phase.trackId))
    .orderBy(asc(phases.sortOrder));

  const aRoll = siblings.filter((p) => p.roll === "A");
  const idx = aRoll.findIndex((p) => p.id === phase.id);
  const prev = idx > 0 ? aRoll[idx - 1] : null;

  // start = day after previous A-roll phase ends
  let start: string;
  if (prev) {
    const prevEnd = phaseEnd(prev.start, prev.duration);
    start = addWeekdays(prevEnd, 1);
  } else {
    start = phase.start; // first A-roll phase — keep existing start
  }

  const span = countWeekdays(start, dueDate);
  const duration = Math.max(minDur, span);
  const adjusted = span < minDur;
  const actualEnd = phaseEnd(start, duration);

  const [updated] = await db
    .update(phases)
    .set({ start, duration, updatedAt: new Date() })
    .where(eq(phases.id, phaseId))
    .returning();

  // Auto-chain subsequent A-roll phases
  const subsequent = aRoll.slice(idx + 1);
  let chainStart = addWeekdays(actualEnd, 1);
  let chainedCount = 0;

  for (const next of subsequent) {
    const nextDur = Math.max(getMinDuration(next.name), next.duration);
    const needsUpdate = next.start !== chainStart || next.duration !== nextDur;

    if (needsUpdate) {
      await db
        .update(phases)
        .set({ start: chainStart, duration: nextDur, updatedAt: new Date() })
        .where(eq(phases.id, next.id));
      chainedCount++;
    }

    const nextEnd = phaseEnd(chainStart, nextDur);
    chainStart = addWeekdays(nextEnd, 1);
  }

  return { updated, adjusted, actualDueDate: actualEnd, chainedCount };
}

/**
 * Rechain A-roll phases in a track.
 *
 * Walks A-roll phases in sortOrder. Each phase's start = next weekday after
 * previous phase's end. Duration is preserved (clamped to min).
 * The first A-roll phase keeps its existing start.
 *
 * B-roll phases are independent and never chained.
 *
 * Returns how many phases were updated.
 */
export async function rechainTrackPhases(trackId: number): Promise<number> {
  const allPhases = await db
    .select()
    .from(phases)
    .where(eq(phases.trackId, trackId))
    .orderBy(asc(phases.sortOrder));

  const aRoll = allPhases.filter((p) => p.roll === "A");
  if (aRoll.length === 0) return 0;

  let totalUpdated = 0;
  let chainStart = aRoll[0].start;

  for (let i = 0; i < aRoll.length; i++) {
    const p = aRoll[i];
    const dur = Math.max(getMinDuration(p.name), p.duration);
    const needsUpdate = p.start !== chainStart || p.duration !== dur;

    if (needsUpdate) {
      await db
        .update(phases)
        .set({ start: chainStart, duration: dur, updatedAt: new Date() })
        .where(eq(phases.id, p.id));
      totalUpdated++;
    }

    const end = phaseEnd(chainStart, dur);
    chainStart = addWeekdays(end, 1);
  }

  return totalUpdated;
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

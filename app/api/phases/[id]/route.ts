/**
 * PATCH /api/phases/[id]
 *
 * Updates a single phase. Supports two modes:
 *   1. Direct update: { status, roll } — then auto-rechains the track
 *   2. Due-date mode: { dueDate } — auto-chains from previous phase
 *
 * Every update triggers a rechain to keep the timeline gap-free.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  updatePhase,
  setPhaseByDueDate,
  rechainTrackPhases,
  type PhaseUpdate,
} from "@/lib/queries";
import { db } from "@/db";
import { phases } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const phaseId = parseInt(id, 10);

  if (isNaN(phaseId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // Due-date mode: auto-chain from previous phase
    if (typeof body.dueDate === "string") {
      // Also apply status/roll if sent alongside dueDate
      if (typeof body.status === "string" || typeof body.roll === "string") {
        const patch: PhaseUpdate = {};
        if (typeof body.status === "string") patch.status = body.status;
        if (typeof body.roll === "string") patch.roll = body.roll;
        await updatePhase(phaseId, patch);
      }
      const result = await setPhaseByDueDate(phaseId, body.dueDate);
      return NextResponse.json(result);
    }

    // Direct update mode (status, roll, etc.)
    const update: PhaseUpdate = {};
    if (typeof body.start === "string")    update.start    = body.start;
    if (typeof body.duration === "number") update.duration = body.duration;
    if (typeof body.status === "string")   update.status   = body.status;
    if (typeof body.roll === "string")     update.roll     = body.roll;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const updated = await updatePhase(phaseId, update);

    // After any update, rechain the track to keep timeline gap-free
    const [phase] = await db.select().from(phases).where(eq(phases.id, phaseId));
    if (phase) {
      await rechainTrackPhases(phase.trackId);
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/phases]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

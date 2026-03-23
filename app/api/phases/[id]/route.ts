/**
 * PATCH /api/phases/[id]
 *
 * Updates a single phase's mutable fields: start, duration, status.
 * Called by the EditPanel when the user saves a change.
 */

import { NextRequest, NextResponse } from "next/server";
import { updatePhase, type PhaseUpdate } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const phaseId = parseInt(id, 10);

  if (isNaN(phaseId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: PhaseUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow the editable fields
  const update: PhaseUpdate = {};
  if (typeof body.start === "string")    update.start    = body.start;
  if (typeof body.duration === "number") update.duration = body.duration;
  if (typeof body.status === "string")   update.status   = body.status;
  if (typeof body.roll === "string")     update.roll     = body.roll;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const updated = await updatePhase(phaseId, update);
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/phases]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

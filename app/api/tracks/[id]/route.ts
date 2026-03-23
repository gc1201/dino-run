/**
 * PATCH /api/tracks/[id]  — Update track fields (jurisdiction, hoppers, timelineStart)
 * DELETE /api/tracks/[id] — Delete a track (phases cascade)
 */

import { NextRequest, NextResponse } from "next/server";
import { updateTrack, deleteTrack, shiftTrackPhases, type TrackUpdate } from "@/lib/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trackId = parseInt(id, 10);
  if (isNaN(trackId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: TrackUpdate = {};
  if (typeof body.jurisdiction === "string")     update.jurisdiction    = body.jurisdiction;
  if (typeof body.mainRunnerId === "number")     update.mainRunnerId   = body.mainRunnerId;
  if (body.mainRunnerId === null)                update.mainRunnerId   = null;
  if (typeof body.hopperMemberId === "number")   update.hopperMemberId = body.hopperMemberId;
  if (body.hopperMemberId === null)              update.hopperMemberId = null;
  if (typeof body.hopperPhaseName === "string")  update.hopperPhaseName = body.hopperPhaseName;
  if (body.hopperPhaseName === null)             update.hopperPhaseName = null;
  if (typeof body.hopper2MemberId === "number")  update.hopper2MemberId = body.hopper2MemberId;
  if (body.hopper2MemberId === null)             update.hopper2MemberId = null;
  if (typeof body.hopper2PhaseName === "string") update.hopper2PhaseName = body.hopper2PhaseName;
  if (body.hopper2PhaseName === null)            update.hopper2PhaseName = null;
  if (typeof body.timelineStart === "string")    update.timelineStart   = body.timelineStart;
  if (body.timelineStart === null)               update.timelineStart   = null;

  // Handle timeline shift: if timelineStart changed, shift all phases
  const oldTimelineStart = typeof body._oldTimelineStart === "string" ? body._oldTimelineStart : null;
  const newTimelineStart = typeof body.timelineStart === "string" ? body.timelineStart : null;

  if (Object.keys(update).length === 0 && !oldTimelineStart) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    let updated;
    if (Object.keys(update).length > 0) {
      updated = await updateTrack(trackId, update);
    }

    // Shift phases if timeline start changed
    if (oldTimelineStart && newTimelineStart && oldTimelineStart !== newTimelineStart) {
      await shiftTrackPhases(trackId, oldTimelineStart, newTimelineStart);
    }

    return NextResponse.json(updated ?? { ok: true });
  } catch (e) {
    console.error("[PATCH /api/tracks]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trackId = parseInt(id, 10);
  if (isNaN(trackId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await deleteTrack(trackId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/tracks]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

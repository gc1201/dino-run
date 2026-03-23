/**
 * POST /api/tracks
 *
 * Creates a new track with default phases.
 */

import { NextRequest, NextResponse } from "next/server";
import { createTrack } from "@/lib/queries";

export async function POST(req: NextRequest) {
  let body: { jurisdiction?: string; startDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jurisdiction = body.jurisdiction?.trim();
  if (!jurisdiction) {
    return NextResponse.json({ error: "jurisdiction required" }, { status: 400 });
  }

  const startDate = body.startDate || new Date().toISOString().slice(0, 10);

  try {
    const track = await createTrack(jurisdiction, startDate);
    return NextResponse.json(track, { status: 201 });
  } catch (e) {
    console.error("[POST /api/tracks]", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

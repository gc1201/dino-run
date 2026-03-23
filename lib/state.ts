/**
 * Converts raw DB rows into the JS state object consumed by sprint_tracker.html.
 *
 * This is the only place that knows about both the DB schema and the animation
 * contract — a clean anti-corruption layer between storage and presentation.
 */

import type { Member, Phase, Track } from "@/db/schema";

type TrackWithPhases = Track & { phases: Phase[] };

export interface AnimationState {
  projectName: string;
  tab: "tracks";
  expandedTrack: null;
  members: AnimationMember[];
  tracks: AnimationTrack[];
}

interface AnimationMember {
  id: number;
  name: string;
  color: string;
  role: string;
}

interface AnimationPhase {
  id: number;
  name: string;
  color: string;
  start: string;
  duration: number;
  status: string;
  roll: string;
  _airtable_id?: number; // exposed so EditPanel can reference by DB id
}

export interface AnimationTrack {
  id: number;
  jurisdiction: string;
  mainRunnerId: number | null;
  hoppers: { memberId: number; phaseId: number }[];
  timelineStart: string | null;
  phases: AnimationPhase[];
}

export function buildAnimationState(
  allMembers: Member[],
  tracksWithPhases: TrackWithPhases[],
  projectName = process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Arnold Sprint"
): AnimationState {
  const memberById = new Map(allMembers.map((m) => [m.id, m]));

  return {
    projectName,
    tab: "tracks",
    expandedTrack: null,
    members: allMembers.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      role: m.role,
    })),
    tracks: tracksWithPhases.map((t) => {
      const bPhases = t.phases.filter((p) => p.roll === "B");
      const hoppers: AnimationTrack["hoppers"] = [];

      // Resolve hopper 1
      if (t.hopperMemberId) {
        const hopperPhase =
          bPhases.find((p) => p.name === t.hopperPhaseName) ?? bPhases[0];
        if (hopperPhase) {
          hoppers.push({ memberId: t.hopperMemberId, phaseId: hopperPhase.id });
        }
      }

      // Resolve hopper 2
      if (t.hopper2MemberId) {
        const hopper2Phase =
          bPhases.find((p) => p.name === t.hopper2PhaseName) ?? bPhases[0];
        if (hopper2Phase) {
          hoppers.push({ memberId: t.hopper2MemberId, phaseId: hopper2Phase.id });
        }
      }

      return {
        id: t.id,
        jurisdiction: t.jurisdiction,
        mainRunnerId: t.mainRunnerId,
        hoppers,
        timelineStart: t.timelineStart,
        phases: t.phases.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          start: p.start,
          duration: p.duration,
          status: p.status,
          roll: p.roll,
          _airtable_id: p.id,
        })),
      };
    }),
  };
}

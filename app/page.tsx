/**
 * Root page — Server Component.
 *
 * Fetches fresh data on every request (no caching), builds the animation
 * state, and passes it down to the client components.
 */

import { getMembers, getTracksWithPhases } from "@/lib/queries";
import { buildAnimationState } from "@/lib/state";
import { SprintRace } from "@/components/SprintRace";
import { EditPanel } from "@/components/EditPanel";
import { AppLayout } from "@/components/MobileLayout";

// Opt out of static generation — data changes on every phase edit
export const dynamic = "force-dynamic";

export default async function Home() {
  const [allMembers, tracksWithPhases] = await Promise.all([
    getMembers(),
    getTracksWithPhases(),
  ]);

  const state = buildAnimationState(allMembers, tracksWithPhases);

  return (
    <AppLayout
      sidebar={<EditPanel state={state} />}
      main={<SprintRace state={state} />}
    />
  );
}

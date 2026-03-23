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

// Opt out of static generation — data changes on every phase edit
export const dynamic = "force-dynamic";

export default async function Home() {
  const [allMembers, tracksWithPhases] = await Promise.all([
    getMembers(),
    getTracksWithPhases(),
  ]);

  const state = buildAnimationState(allMembers, tracksWithPhases);

  return (
    <div style={styles.root}>
      <aside style={styles.sidebar}>
        <EditPanel state={state} />
      </aside>
      <main style={styles.main}>
        <SprintRace state={state} />
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100dvh",
    overflow: "hidden",
    background: "#111",
  },
  sidebar: {
    width: 300,
    flexShrink: 0,
    borderRight: "1px solid #333",
    overflowY: "auto" as const,
    background: "#1a1a1a",
  },
  main: {
    flex: 1,
    overflow: "hidden",
    position: "relative" as const,
  },
} as const;

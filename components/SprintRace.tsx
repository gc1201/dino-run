"use client";

/**
 * SprintRace — embeds the canvas animation inside an iframe using srcdoc.
 *
 * Why iframe + srcdoc?
 *   The animation is a self-contained HTML/JS/Canvas app. Embedding it in an
 *   iframe gives it a clean global scope (no Next.js React conflicts) and lets
 *   the canvas fill the whole viewport inside the frame.
 *
 * How state flows in:
 *   1. Server Component fetches data from Supabase via Drizzle
 *   2. Passes serialized state to this client component as a prop
 *   3. We fetch the raw HTML template from /sprint_tracker.html
 *   4. Inject window.__SPRINT_STATE__ before </head>
 *   5. Set the iframe srcdoc — animation boots with live DB data
 *
 * On re-render (after an edit + router.refresh()):
 *   The state prop changes → JSON.stringify dependency → new srcdoc → iframe
 *   seamlessly reloads with fresh data, race resets to start line.
 */

import { useEffect, useState } from "react";
import type { AnimationState } from "@/lib/state";

interface Props {
  state: AnimationState;
}

export function SprintRace({ state }: Props) {
  const [srcdoc, setSrcdoc] = useState<string>("");

  const stateJson = JSON.stringify(state);

  useEffect(() => {
    fetch("/sprint_tracker.html")
      .then((r) => r.text())
      .then((raw) => {
        const injection = `<script>window.__SPRINT_STATE__ = ${stateJson};</script>`;
        setSrcdoc(raw.replace("</head>", injection + "\n</head>"));
      })
      .catch(console.error);
    // stateJson as dep — stable string comparison, re-fetches only on real data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateJson]);

  if (!srcdoc) {
    return (
      <div style={loadingStyle}>
        <span style={{ fontFamily: "Courier New", color: "#555", fontSize: 13 }}>
          LOADING RACE…
        </span>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcdoc}
      title="Sprint Race Animation"
      style={iframeStyle}
      // sandbox allows scripts but restricts navigation + popups
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
  background: "#111",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  background: "#111",
};

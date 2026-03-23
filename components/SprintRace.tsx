"use client";

/**
 * SprintRace — embeds the canvas animation inside an iframe.
 *
 * Two-phase approach:
 *   1. INITIAL LOAD: fetch HTML template, inject state, set srcdoc (once)
 *   2. UPDATES: push new state into the iframe via postMessage (no reload)
 *
 * This preserves animation positions — dinos keep running instead of resetting.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { AnimationState } from "@/lib/state";

interface Props {
  state: AnimationState;
}

export function SprintRace({ state }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcdoc, setSrcdoc] = useState<string>("");
  const loadedStateRef = useRef<string>(""); // tracks what state the iframe was initialized with
  const iframeReadyRef = useRef(false);

  const stateJson = JSON.stringify(state);

  // Mark iframe as ready when it loads
  const handleIframeLoad = useCallback(() => {
    iframeReadyRef.current = true;
  }, []);

  // Phase 1: Load HTML template and inject initial state (once)
  useEffect(() => {
    if (loadedStateRef.current) return; // already loaded
    loadedStateRef.current = stateJson;

    fetch("/sprint_tracker.html")
      .then((r) => r.text())
      .then((raw) => {
        const injection = `<script>window.__SPRINT_STATE__ = ${stateJson};</script>`;
        setSrcdoc(raw.replace("</head>", injection + "\n</head>"));
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2: Push incremental updates via postMessage
  useEffect(() => {
    // Skip if this is the same state the iframe was initialized with
    if (stateJson === loadedStateRef.current) return;
    if (!iframeReadyRef.current) return;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      { type: "stateUpdate", state },
      "*"
    );
  }, [stateJson, state]);

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
      ref={iframeRef}
      srcDoc={srcdoc}
      onLoad={handleIframeLoad}
      title="Sprint Race Animation"
      style={iframeStyle}
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

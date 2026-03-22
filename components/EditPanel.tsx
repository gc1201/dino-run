"use client";

/**
 * EditPanel — sidebar for editing phase dates, durations, and statuses.
 *
 * Pattern:
 *   User edits → optimistic local state update → PATCH /api/phases/[id]
 *   → router.refresh() re-runs the Server Component → fresh state flows
 *   back into SprintRace → animation reloads with new data.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AnimationState } from "@/lib/state";

const STATUSES = ["not_started", "in_progress", "done"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  not_started: "○ Not started",
  in_progress: "▶ In progress",
  done:        "✓ Done",
};

interface Props {
  state: AnimationState;
}

export function EditPanel({ state }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<number | null>(null); // phase id being saved
  const [error, setError]   = useState<string | null>(null);

  async function savePhase(
    phaseId: number,
    data: { start?: string; duration?: number; status?: string }
  ) {
    setSaving(phaseId);
    setError(null);
    try {
      const res = await fetch(`/api/phases/${phaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh(); // re-runs Server Component → fresh state
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>⬤ ARNOLD SPRINT</span>
        <span style={styles.subtitle}>{state.projectName}</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Tracks */}
      {state.tracks.map((track) => {
        const runner = state.members.find((m) => m.id === track.mainRunnerId);
        return (
          <details key={track.id} style={styles.trackBlock}>
            <summary style={{ ...styles.trackHeader, color: runner?.color ?? "#888" }}>
              {track.jurisdiction}
            </summary>

            <div style={styles.phaseList}>
              {track.phases.map((phase) => (
                <PhaseRow
                  key={phase.id}
                  phase={phase}
                  isSaving={saving === phase.id}
                  onSave={(data) => savePhase(phase.id, data)}
                />
              ))}
            </div>
          </details>
        );
      })}

      <div style={styles.footer}>
        built with Next.js · Supabase · Drizzle
      </div>
    </div>
  );
}

// ── Phase row ─────────────────────────────────────────────────────────────────

interface PhaseRowProps {
  phase: AnimationState["tracks"][0]["phases"][0];
  isSaving: boolean;
  onSave: (data: { start?: string; duration?: number; status?: string }) => void;
}

function PhaseRow({ phase, isSaving, onSave }: PhaseRowProps) {
  const [start, setStart]       = useState(phase.start);
  const [duration, setDuration] = useState(phase.duration);
  const [status, setStatus]     = useState<Status>(phase.status as Status);

  const dirty =
    start !== phase.start ||
    duration !== phase.duration ||
    status !== phase.status;

  return (
    <div style={styles.phaseRow}>
      {/* Phase label */}
      <div style={styles.phaseLabel}>
        <span
          style={{
            ...styles.rollBadge,
            background: phase.roll === "B" ? "#333" : "transparent",
            color: phase.roll === "B" ? "#aaa" : "#555",
          }}
        >
          {phase.roll}
        </span>
        <span style={{ color: phase.color, fontWeight: 700, fontSize: 11 }}>
          {phase.name}
        </span>
      </div>

      {/* Inputs */}
      <div style={styles.inputs}>
        <input
          style={styles.dateInput}
          type="text"
          value={start}
          placeholder="YYYY-MM-DD"
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          style={styles.numInput}
          type="number"
          min={1}
          max={365}
          value={duration}
          title="weekdays"
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <select
          style={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Save */}
      {dirty && (
        <button
          style={{ ...styles.saveBtn, opacity: isSaving ? 0.5 : 1 }}
          disabled={isSaving}
          onClick={() => onSave({ start, duration, status })}
        >
          {isSaving ? "…" : "SAVE"}
        </button>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    fontFamily: "'Courier New', monospace",
  },
  header: {
    padding: "16px 14px 12px",
    borderBottom: "1px solid #222",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#fff",
    textTransform: "uppercase" as const,
  },
  subtitle: {
    fontSize: 11,
    color: "#555",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  error: {
    margin: "8px 12px",
    padding: "8px 10px",
    background: "rgba(239,68,68,.15)",
    border: "1px solid #ef4444",
    borderRadius: 4,
    fontSize: 11,
    color: "#ef4444",
  },
  trackBlock: {
    borderBottom: "1px solid #1a1a1a",
  },
  trackHeader: {
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    userSelect: "none" as const,
    listStyle: "none",
  },
  phaseList: {
    padding: "4px 10px 10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  phaseRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 5,
    padding: "8px 8px",
    background: "#0d0d0d",
    borderRadius: 5,
    border: "1px solid #1e1e1e",
  },
  phaseLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  rollBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: 2,
    border: "1px solid #333",
    letterSpacing: "0.08em",
  },
  inputs: {
    display: "grid",
    gridTemplateColumns: "1fr 44px",
    gridTemplateRows: "auto auto",
    gap: 4,
  },
  dateInput: {
    gridColumn: "1 / 2",
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#e8e8e8",
    padding: "5px 7px",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    width: "100%",
  },
  numInput: {
    gridColumn: "2 / 3",
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#aaa",
    padding: "5px 4px",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    textAlign: "center" as const,
    width: "100%",
  },
  select: {
    gridColumn: "1 / 3",
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#aaa",
    padding: "5px 7px",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  },
  saveBtn: {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 3,
    padding: "4px 10px",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.1em",
    cursor: "pointer",
    alignSelf: "flex-end" as const,
  },
  footer: {
    marginTop: "auto",
    padding: "12px 14px",
    borderTop: "1px solid #1a1a1a",
    fontSize: 10,
    color: "#333",
    letterSpacing: "0.04em",
  },
} as const;

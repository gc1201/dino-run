"use client";

/**
 * EditPanel — sidebar for editing phase due dates, durations, statuses, rolls,
 * track timeline starts, jurisdictions, and hopper assignments.
 *
 * NOTE: This component is currently unused — the app uses the HTML-based edit
 * panel inside sprint_tracker.html. Kept for reference / potential future use.
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

/** Add weekdays to a date string (YYYY-MM-DD). */
function addWeekdays(dateStr: string, n: number): string {
  if (n <= 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d.toISOString().slice(0, 10);
}

/** Subtract weekdays from a date string (YYYY-MM-DD). */
function subtractWeekdays(dateStr: string, n: number): string {
  if (n <= 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d.toISOString().slice(0, 10);
}

/** Compute due date from start + duration (weekdays). */
function computeDueDate(start: string, duration: number): string {
  if (duration <= 1) return start;
  return addWeekdays(start, duration - 1);
}

export function EditPanel({ state }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError]   = useState<string | null>(null);

  async function savePhase(
    phaseId: number,
    data: { start?: string; duration?: number; status?: string; roll?: string }
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
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  async function saveTrack(
    trackId: number,
    data: Record<string, unknown>
  ) {
    setError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  async function addJurisdiction() {
    const name = prompt("Jurisdiction name:");
    if (!name?.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurisdiction: name.trim(), startDate: "2026-03-10" }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteJurisdiction(trackId: number, jurisdiction: string) {
    if (!confirm(`Delete "${jurisdiction}" and all its phases?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  const hopperMembers = state.members.filter((m) => m.role === "hopper");

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>⬤ ARNOLD SPRINT</span>
        <span style={styles.subtitle}>{state.projectName}</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {state.tracks.map((track) => {
          const runner = state.members.find((m) => m.id === track.mainRunnerId);
          const bPhaseNames = track.phases
            .filter((p) => p.roll === "B")
            .map((p) => p.name);

          return (
            <details key={track.id} style={styles.trackBlock}>
              <summary style={{ ...styles.trackHeader, color: runner?.color ?? "#888" }}>
                <span style={{ flex: 1 }}>{track.jurisdiction}</span>
                <button
                  style={styles.deleteTrackBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteJurisdiction(track.id, track.jurisdiction);
                  }}
                  title="Delete jurisdiction"
                >
                  ✕
                </button>
              </summary>

              <div style={styles.timelineStartRow}>
                <span style={styles.timelineLabel}>Timeline Start</span>
                <TimelineStartInput
                  trackId={track.id}
                  value={track.timelineStart}
                  onSave={(oldVal, newVal) =>
                    saveTrack(track.id, {
                      timelineStart: newVal,
                      _oldTimelineStart: oldVal,
                    })
                  }
                />
              </div>

              <div style={styles.hopperSection}>
                <span style={styles.hopperLabel}>Hopper 1</span>
                <div style={styles.hopperRow}>
                  <select
                    style={styles.hopperSelect}
                    value={track.hoppers[0]?.memberId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      saveTrack(track.id, { hopperMemberId: val });
                    }}
                  >
                    <option value="">None</option>
                    {hopperMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    style={styles.hopperSelect}
                    value={
                      track.hoppers[0]
                        ? track.phases.find((p) => p.id === track.hoppers[0].phaseId)?.name ?? ""
                        : ""
                    }
                    disabled={!track.hoppers[0]}
                    onChange={(e) => {
                      saveTrack(track.id, { hopperPhaseName: e.target.value || null });
                    }}
                  >
                    <option value="">-</option>
                    {bPhaseNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <span style={styles.hopperLabel}>Hopper 2</span>
                <div style={styles.hopperRow}>
                  <select
                    style={styles.hopperSelect}
                    value={track.hoppers[1]?.memberId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      saveTrack(track.id, { hopper2MemberId: val });
                    }}
                  >
                    <option value="">None</option>
                    {hopperMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <select
                    style={styles.hopperSelect}
                    value={
                      track.hoppers[1]
                        ? track.phases.find((p) => p.id === track.hoppers[1].phaseId)?.name ?? ""
                        : ""
                    }
                    disabled={!track.hoppers[1]}
                    onChange={(e) => {
                      saveTrack(track.id, { hopper2PhaseName: e.target.value || null });
                    }}
                  >
                    <option value="">-</option>
                    {bPhaseNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

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

        <button style={styles.addJurisdictionBtn} onClick={addJurisdiction}>
          ＋ Add Jurisdiction
        </button>
      </div>

      <div style={styles.footer}>
        built with Next.js · Supabase · Drizzle
      </div>
    </div>
  );
}

// ── Timeline Start Input ─────────────────────────────────────────────────────

function TimelineStartInput({
  trackId,
  value,
  onSave,
}: {
  trackId: number;
  value: string | null;
  onSave: (oldVal: string | null, newVal: string) => void;
}) {
  const [input, setInput] = useState(value ?? "");
  const dirty = input !== (value ?? "");

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        style={styles.dateInput}
        type="text"
        value={input}
        placeholder="YYYY-MM-DD"
        onChange={(e) => setInput(e.target.value)}
      />
      {dirty && (
        <button
          style={styles.saveBtn}
          onClick={() => onSave(value, input)}
        >
          SHIFT
        </button>
      )}
    </div>
  );
}

// ── Phase row — edit due date instead of start date ──────────────────────────

interface PhaseRowProps {
  phase: AnimationState["tracks"][0]["phases"][0];
  isSaving: boolean;
  onSave: (data: { start?: string; duration?: number; status?: string; roll?: string }) => void;
}

function PhaseRow({ phase, isSaving, onSave }: PhaseRowProps) {
  const currentDueDate = computeDueDate(phase.start, phase.duration);
  const [dueDate, setDueDate] = useState(currentDueDate);
  const [duration, setDuration] = useState(phase.duration);
  const [status, setStatus]     = useState<Status>(phase.status as Status);
  const [roll, setRoll]         = useState(phase.roll);

  // Compute what start would be from the entered due date and duration
  const computedStart = subtractWeekdays(dueDate, Math.max(1, duration) - 1);

  const dirty =
    computedStart !== phase.start ||
    duration !== phase.duration ||
    status !== phase.status ||
    roll !== phase.roll;

  function toggleRoll() {
    setRoll(roll === "A" ? "B" : "A");
  }

  return (
    <div style={styles.phaseRow}>
      <div style={styles.phaseLabel}>
        <button
          style={{
            ...styles.rollBadge,
            background: roll === "B" ? "#333" : "transparent",
            color: roll === "B" ? "#aaa" : "#555",
            cursor: "pointer",
            border: "1px solid #555",
          }}
          onClick={toggleRoll}
          title="Toggle A/B roll"
        >
          {roll}
        </button>
        <span style={{ color: phase.color, fontWeight: 700, fontSize: 11 }}>
          {phase.name}
        </span>
      </div>

      <div style={styles.inputs}>
        <input
          style={styles.dateInput}
          type="text"
          value={dueDate}
          placeholder="Due YYYY-MM-DD"
          onChange={(e) => setDueDate(e.target.value)}
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

      {dirty && (
        <button
          style={{ ...styles.saveBtn, opacity: isSaving ? 0.5 : 1 }}
          disabled={isSaving}
          onClick={() => onSave({ start: computedStart, duration, status, roll })}
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
    listStyle: "none" as const,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  deleteTrackBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 3,
    fontFamily: "'Courier New', monospace",
  },
  timelineStartRow: {
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  timelineLabel: {
    fontSize: 10,
    color: "#666",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  },
  hopperSection: {
    padding: "4px 14px 8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  hopperLabel: {
    fontSize: 10,
    color: "#666",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  hopperRow: {
    display: "flex",
    gap: 6,
  },
  hopperSelect: {
    flex: 1,
    background: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: 4,
    color: "#aaa",
    padding: "4px 6px",
    fontSize: 10,
    fontFamily: "'Courier New', monospace",
    outline: "none",
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
    fontFamily: "'Courier New', monospace",
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
  addJurisdictionBtn: {
    display: "block",
    width: "calc(100% - 20px)",
    margin: "10px 10px",
    padding: "10px",
    background: "transparent",
    border: "1px dashed #333",
    borderRadius: 5,
    color: "#666",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.06em",
    cursor: "pointer",
    textAlign: "center" as const,
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

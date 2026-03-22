/**
 * Drizzle schema — single source of truth for the database shape.
 *
 * Tables mirror the JS animation state:
 *   members  →  S.members[]
 *   tracks   →  S.tracks[]
 *   phases   →  S.tracks[].phases[]
 *
 * Future growth: add a `sprints` table and link tracks → sprint_id
 * to support multiple sprint cycles without changing this schema.
 */

import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Members ───────────────────────────────────────────────────────────────────

export const members = pgTable("members", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  color:     text("color").notNull().default("#888888"), // hex
  role:      text("role").notNull().default("runner"),   // "runner" | "hopper"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Tracks ────────────────────────────────────────────────────────────────────

export const tracks = pgTable("tracks", {
  id:              serial("id").primaryKey(),
  jurisdiction:    text("jurisdiction").notNull(),
  mainRunnerId:    integer("main_runner_id").references(() => members.id, {
    onDelete: "set null",
  }),
  // Hopper assignment: which member + which B-roll phase name they assist on
  hopperMemberId:  integer("hopper_member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  hopperPhaseName: text("hopper_phase_name"), // e.g. "Land Value"
  sortOrder:       integer("sort_order").notNull().default(0),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

// ── Phases ────────────────────────────────────────────────────────────────────

export const phases = pgTable("phases", {
  id:        serial("id").primaryKey(),
  trackId:   integer("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  color:     text("color").notNull().default("#3B82F6"),
  start:     text("start").notNull(),              // YYYY-MM-DD
  duration:  integer("duration").notNull().default(5), // weekdays
  status:    text("status").notNull().default("not_started"), // not_started | in_progress | done
  roll:      text("roll").notNull().default("A"),  // A | B
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Types (inferred from schema) ──────────────────────────────────────────────

export type Member = typeof members.$inferSelect;
export type Track  = typeof tracks.$inferSelect;
export type Phase  = typeof phases.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;

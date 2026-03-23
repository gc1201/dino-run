CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#888888' NOT NULL,
	"role" text DEFAULT 'runner' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"start" text NOT NULL,
	"duration" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"roll" text DEFAULT 'A' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"jurisdiction" text NOT NULL,
	"main_runner_id" integer,
	"hopper_member_id" integer,
	"hopper_phase_name" text,
	"hopper2_member_id" integer,
	"hopper2_phase_name" text,
	"timeline_start" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_main_runner_id_members_id_fk" FOREIGN KEY ("main_runner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_hopper_member_id_members_id_fk" FOREIGN KEY ("hopper_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_hopper2_member_id_members_id_fk" FOREIGN KEY ("hopper2_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
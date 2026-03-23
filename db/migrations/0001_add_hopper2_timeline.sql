ALTER TABLE "tracks" ADD COLUMN "hopper2_member_id" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "hopper2_phase_name" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "timeline_start" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_hopper2_member_id_members_id_fk" FOREIGN KEY ("hopper2_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;

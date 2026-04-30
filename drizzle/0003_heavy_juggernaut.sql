ALTER TYPE "public"."feed_type" ADD VALUE 'nudge' BEFORE 'prost_sent';--> statement-breakpoint
ALTER TABLE "nudges" ADD COLUMN "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nudges" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
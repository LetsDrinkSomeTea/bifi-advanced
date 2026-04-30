ALTER TYPE "public"."feed_type" ADD VALUE 'group_created' BEFORE 'nudge';--> statement-breakpoint
ALTER TYPE "public"."feed_type" ADD VALUE 'group_left' BEFORE 'nudge';--> statement-breakpoint
ALTER TYPE "public"."feed_type" ADD VALUE 'group_deleted' BEFORE 'nudge';--> statement-breakpoint
ALTER TYPE "public"."feed_type" ADD VALUE 'friendship_started' BEFORE 'goal_reached';
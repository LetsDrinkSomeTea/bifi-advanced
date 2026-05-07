CREATE TYPE "public"."audit_severity" AS ENUM('info', 'low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" "audit_severity" DEFAULT 'low' NOT NULL;
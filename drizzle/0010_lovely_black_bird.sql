ALTER TABLE "promotions" ADD COLUMN "quantity_limit" integer;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "quantity_used" integer DEFAULT 0 NOT NULL;
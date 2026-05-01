ALTER TABLE "promotions" ALTER COLUMN "discount_percent" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "discount_fixed_cents" integer;
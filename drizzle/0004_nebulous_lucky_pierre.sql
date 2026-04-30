CREATE TABLE "prost_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"from_transaction_id" uuid,
	"redeemed_transaction_id" uuid,
	"redeemed_at" timestamp,
	"credited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prost_vouchers" ADD CONSTRAINT "prost_vouchers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prost_vouchers" ADD CONSTRAINT "prost_vouchers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prost_vouchers" ADD CONSTRAINT "prost_vouchers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prost_vouchers" ADD CONSTRAINT "prost_vouchers_from_transaction_id_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prost_vouchers" ADD CONSTRAINT "prost_vouchers_redeemed_transaction_id_transactions_id_fk" FOREIGN KEY ("redeemed_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
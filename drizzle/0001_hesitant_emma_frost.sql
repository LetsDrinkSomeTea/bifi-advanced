CREATE TABLE "user_favorites" (
	"user_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_user_id_variant_id_pk" PRIMARY KEY("user_id","variant_id")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyables" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "buyables" DROP COLUMN "base_price";--> statement-breakpoint
ALTER TABLE "buyables" DROP COLUMN "is_quick_buy";
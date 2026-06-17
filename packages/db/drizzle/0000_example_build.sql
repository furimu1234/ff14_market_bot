CREATE TABLE "homeworld" (
	"user_id" varchar(19) PRIMARY KEY NOT NULL,
	"worldname" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "homeworld_user_id" ON "homeworld" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE "myset_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(19) NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "myset_item_user_id" ON "myset_item" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "myset_item_user_item_id" ON "myset_item" USING btree ("user_id","item_id");

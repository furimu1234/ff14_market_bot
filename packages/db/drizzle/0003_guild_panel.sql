CREATE TABLE IF NOT EXISTS "guild_panel" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"panel_type" text NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"message_id" varchar(20),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_panel_guild_id" ON "guild_panel" USING btree ("guild_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_panel_channel_id" ON "guild_panel" USING btree ("channel_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_panel_guild_panel_type" ON "guild_panel" USING btree ("guild_id","panel_type");

CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'in_play', 'paused', 'finished', 'suspended', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."player_role" AS ENUM('admin', 'player');--> statement-breakpoint
CREATE TYPE "public"."result_source" AS ENUM('api', 'admin');--> statement-breakpoint
CREATE TABLE "bonus_picks" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"champion_team_id" integer,
	"top_scorer" text,
	"finalist1_team_id" integer,
	"finalist2_team_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"group" text,
	"matchday" integer,
	"home_team_id" integer,
	"away_team_id" integer,
	"kickoff" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score_90" integer,
	"away_score_90" integer,
	"advancing_team_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"role" "player_role" DEFAULT 'player' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "prediction_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"prev_home_score" integer,
	"prev_away_score" integer,
	"prev_advancing_team_id" integer,
	"new_home_score" integer NOT NULL,
	"new_away_score" integer NOT NULL,
	"new_advancing_team_id" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"advancing_team_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_player_id_match_id_unique" UNIQUE("player_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "result_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"source" "result_source" NOT NULL,
	"actor_player_id" integer,
	"prev_home_score" integer,
	"prev_away_score" integer,
	"prev_advancing_team_id" integer,
	"new_home_score" integer,
	"new_away_score" integer,
	"new_advancing_team_id" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"entry_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'CLP' NOT NULL,
	"bonus_deadline" timestamp with time zone,
	"prize_first_pct" integer DEFAULT 60 NOT NULL,
	"prize_second_pct" integer DEFAULT 30 NOT NULL,
	"prize_third_pct" integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"tla" text,
	"crest" text
);
--> statement-breakpoint
ALTER TABLE "bonus_picks" ADD CONSTRAINT "bonus_picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_picks" ADD CONSTRAINT "bonus_picks_champion_team_id_teams_id_fk" FOREIGN KEY ("champion_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_picks" ADD CONSTRAINT "bonus_picks_finalist1_team_id_teams_id_fk" FOREIGN KEY ("finalist1_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_picks" ADD CONSTRAINT "bonus_picks_finalist2_team_id_teams_id_fk" FOREIGN KEY ("finalist2_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_advancing_team_id_teams_id_fk" FOREIGN KEY ("advancing_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_audit" ADD CONSTRAINT "prediction_audit_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_audit" ADD CONSTRAINT "prediction_audit_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_advancing_team_id_teams_id_fk" FOREIGN KEY ("advancing_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_audit" ADD CONSTRAINT "result_audit_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_audit" ADD CONSTRAINT "result_audit_actor_player_id_players_id_fk" FOREIGN KEY ("actor_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
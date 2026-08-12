CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."search_canon_status" AS ENUM('canon', 'adaptation_supplement', 'conflict', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."search_document_kind" AS ENUM('article', 'character', 'nen_ability', 'organization', 'story_arc');--> statement-breakpoint
CREATE TYPE "public"."search_spoiler_level" AS ENUM('safe', 'anime', 'manga');--> statement-breakpoint
CREATE TYPE "public"."search_target_kind" AS ENUM('article', 'catalog_entity');--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "search_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"kind" "search_document_kind" NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"normalized_aliases" text[] NOT NULL,
	"body" text NOT NULL,
	"search_text" text NOT NULL,
	"canon_status" "search_canon_status" NOT NULL,
	"spoiler_level" "search_spoiler_level" NOT NULL,
	"projection_version" integer NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"projected_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_documents_target_kind_consistent" CHECK (("search_documents"."target_kind" = 'article' and "search_documents"."kind" = 'article') or ("search_documents"."target_kind" = 'catalog_entity' and "search_documents"."kind" <> 'article')),
	CONSTRAINT "search_documents_locale_shape" CHECK ("search_documents"."locale" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "search_documents_projection_version_positive" CHECK ("search_documents"."projection_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "search_query_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_fingerprint" text NOT NULL,
	"query_length" integer NOT NULL,
	"filters" jsonb NOT NULL,
	"result_count" integer NOT NULL,
	"zero_result" boolean NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_query_metrics_fingerprint_shape" CHECK ("search_query_metrics"."query_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "search_query_metrics_query_length_range" CHECK ("search_query_metrics"."query_length" between 1 and 100),
	CONSTRAINT "search_query_metrics_result_count_nonnegative" CHECK ("search_query_metrics"."result_count" >= 0),
	CONSTRAINT "search_query_metrics_zero_result_consistent" CHECK (("search_query_metrics"."zero_result" and "search_query_metrics"."result_count" = 0) or (not "search_query_metrics"."zero_result" and "search_query_metrics"."result_count" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_target_locale_unique" ON "search_documents" USING btree ("target_kind","target_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_slug_locale_unique" ON "search_documents" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "search_documents_filters_idx" ON "search_documents" USING btree ("kind","canon_status","spoiler_level");--> statement-breakpoint
CREATE INDEX "search_documents_title_trgm_idx" ON "search_documents" USING gin ("normalized_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "search_documents_text_trgm_idx" ON "search_documents" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "search_query_metrics_occurred_at_idx" ON "search_query_metrics" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "search_query_metrics_zero_result_idx" ON "search_query_metrics" USING btree ("zero_result","occurred_at");

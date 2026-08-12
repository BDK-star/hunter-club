CREATE TYPE "public"."catalog_canon_status" AS ENUM('canon', 'adaptation_supplement', 'conflict', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."catalog_entity_kind" AS ENUM('character', 'nen_ability', 'organization', 'story_arc');--> statement-breakpoint
CREATE TYPE "public"."catalog_entity_state" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."catalog_source_type" AS ENUM('manga', 'anime_1999', 'anime_2011', 'film', 'official_guide', 'official_interview', 'game', 'other_official');--> statement-breakpoint
CREATE TYPE "public"."catalog_spoiler_level" AS ENUM('safe', 'anime', 'manga');--> statement-breakpoint
CREATE TYPE "public"."source_assertion" AS ENUM('supports', 'contradicts');--> statement-breakpoint
CREATE TYPE "public"."source_locator_type" AS ENUM('chapter', 'episode', 'page', 'section', 'timestamp', 'other');--> statement-breakpoint
CREATE TABLE "catalog_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "catalog_entity_kind" NOT NULL,
	"slug" text NOT NULL,
	"state" "catalog_entity_state" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "catalog_entities_slug_shape" CHECK ("catalog_entities"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_entities_archive_state" CHECK (("catalog_entities"."state" = 'archived' and "catalog_entities"."archived_at" is not null) or ("catalog_entities"."state" <> 'archived' and "catalog_entities"."archived_at" is null))
);
--> statement-breakpoint
CREATE TABLE "claim_sources" (
	"claim_id" uuid NOT NULL,
	"source_reference_id" uuid NOT NULL,
	"assertion" "source_assertion" DEFAULT 'supports' NOT NULL,
	CONSTRAINT "claim_sources_claim_id_source_reference_id_pk" PRIMARY KEY("claim_id","source_reference_id")
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_aliases_entity_locale_normalized_unique" UNIQUE("entity_id","locale","normalized_alias"),
	CONSTRAINT "entity_aliases_locale_shape" CHECK ("entity_aliases"."locale" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "entity_aliases_value_length" CHECK (char_length("entity_aliases"."alias") between 1 and 160 and char_length("entity_aliases"."normalized_alias") between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "entity_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"canon_status" "catalog_canon_status" NOT NULL,
	"spoiler_level" "catalog_spoiler_level" NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_relations_unique" UNIQUE("source_entity_id","target_entity_id","relation_type","canon_status"),
	CONSTRAINT "entity_relations_distinct_entities" CHECK ("entity_relations"."source_entity_id" <> "entity_relations"."target_entity_id"),
	CONSTRAINT "entity_relations_type_shape" CHECK ("entity_relations"."relation_type" ~ '^[a-z][a-z0-9_.-]{0,99}$'),
	CONSTRAINT "entity_relations_verified_not_future" CHECK ("entity_relations"."verified_at" <= now())
);
--> statement-breakpoint
CREATE TABLE "entity_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_translations_entity_locale_unique" UNIQUE("entity_id","locale"),
	CONSTRAINT "entity_translations_locale_shape" CHECK ("entity_translations"."locale" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "entity_translations_name_length" CHECK (char_length("entity_translations"."name") between 1 and 160),
	CONSTRAINT "entity_translations_summary_length" CHECK ("entity_translations"."summary" is null or char_length("entity_translations"."summary") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "fact_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"predicate" text NOT NULL,
	"statement" text NOT NULL,
	"value" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"canon_status" "catalog_canon_status" NOT NULL,
	"spoiler_level" "catalog_spoiler_level" NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fact_claims_predicate_shape" CHECK ("fact_claims"."predicate" ~ '^[a-z][a-z0-9_.-]{0,99}$'),
	CONSTRAINT "fact_claims_statement_length" CHECK (char_length("fact_claims"."statement") between 1 and 2000),
	CONSTRAINT "fact_claims_schema_version_positive" CHECK ("fact_claims"."schema_version" > 0),
	CONSTRAINT "fact_claims_verified_not_future" CHECK ("fact_claims"."verified_at" <= now())
);
--> statement-breakpoint
CREATE TABLE "relation_sources" (
	"relation_id" uuid NOT NULL,
	"source_reference_id" uuid NOT NULL,
	"assertion" "source_assertion" DEFAULT 'supports' NOT NULL,
	CONSTRAINT "relation_sources_relation_id_source_reference_id_pk" PRIMARY KEY("relation_id","source_reference_id")
);
--> statement-breakpoint
CREATE TABLE "slug_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"replaced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slug_history_slug_shape" CHECK ("slug_history"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "source_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"locator_type" "source_locator_type" NOT NULL,
	"locator" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_references_source_locator_unique" UNIQUE("source_id","locator_type","locator"),
	CONSTRAINT "source_references_locator_length" CHECK (char_length("source_references"."locator") between 1 and 160),
	CONSTRAINT "source_references_note_length" CHECK ("source_references"."note" is null or char_length("source_references"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "catalog_source_type" NOT NULL,
	"title" text NOT NULL,
	"language" text NOT NULL,
	"publisher" text,
	"external_url" text,
	"published_on" date,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_title_length" CHECK (char_length("sources"."title") between 1 and 300),
	CONSTRAINT "sources_language_shape" CHECK ("sources"."language" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "sources_external_url_shape" CHECK ("sources"."external_url" is null or "sources"."external_url" ~ '^https://')
);
--> statement-breakpoint
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_claim_id_fact_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."fact_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_source_reference_id_source_references_id_fk" FOREIGN KEY ("source_reference_id") REFERENCES "public"."source_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_catalog_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_source_entity_id_catalog_entities_id_fk" FOREIGN KEY ("source_entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_target_entity_id_catalog_entities_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_translations" ADD CONSTRAINT "entity_translations_entity_id_catalog_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_claims" ADD CONSTRAINT "fact_claims_entity_id_catalog_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_sources" ADD CONSTRAINT "relation_sources_relation_id_entity_relations_id_fk" FOREIGN KEY ("relation_id") REFERENCES "public"."entity_relations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_sources" ADD CONSTRAINT "relation_sources_source_reference_id_source_references_id_fk" FOREIGN KEY ("source_reference_id") REFERENCES "public"."source_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_history" ADD CONSTRAINT "slug_history_entity_id_catalog_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_references" ADD CONSTRAINT "source_references_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_entities_slug_unique" ON "catalog_entities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_entities_kind_state_idx" ON "catalog_entities" USING btree ("kind","state");--> statement-breakpoint
CREATE INDEX "catalog_entities_created_by_idx" ON "catalog_entities" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "claim_sources_reference_idx" ON "claim_sources" USING btree ("source_reference_id");--> statement-breakpoint
CREATE INDEX "entity_aliases_normalized_idx" ON "entity_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "entity_relations_target_idx" ON "entity_relations" USING btree ("target_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_translations_one_primary_unique" ON "entity_translations" USING btree ("entity_id") WHERE "entity_translations"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "entity_translations_locale_name_idx" ON "entity_translations" USING btree ("locale","name");--> statement-breakpoint
CREATE INDEX "fact_claims_entity_spoiler_idx" ON "fact_claims" USING btree ("entity_id","spoiler_level");--> statement-breakpoint
CREATE INDEX "fact_claims_predicate_idx" ON "fact_claims" USING btree ("predicate");--> statement-breakpoint
CREATE INDEX "relation_sources_reference_idx" ON "relation_sources" USING btree ("source_reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_history_slug_unique" ON "slug_history" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "slug_history_entity_id_idx" ON "slug_history" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "source_references_source_id_idx" ON "source_references" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_type_title_idx" ON "sources" USING btree ("type","title");--> statement-breakpoint
CREATE INDEX "sources_created_by_idx" ON "sources" USING btree ("created_by_user_id");
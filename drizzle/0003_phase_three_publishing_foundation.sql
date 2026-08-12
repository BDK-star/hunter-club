CREATE TYPE "public"."article_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."publication_event_type" AS ENUM('published', 'rolled_back', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('approved', 'changes_requested', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."revision_target_kind" AS ENUM('article', 'catalog_entity');--> statement-breakpoint
CREATE TABLE "article_publications" (
	"article_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"published_by_user_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_publications_article_id_pk" PRIMARY KEY("article_id"),
	CONSTRAINT "article_publications_revision_unique" UNIQUE("revision_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"state" "article_state" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "articles_slug_shape" CHECK ("articles"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "articles_archive_state" CHECK (("articles"."state" = 'archived' and "articles"."archived_at" is not null) or ("articles"."state" <> 'archived' and "articles"."archived_at" is null))
);
--> statement-breakpoint
CREATE TABLE "catalog_publications" (
	"catalog_entity_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"published_by_user_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_publications_catalog_entity_id_pk" PRIMARY KEY("catalog_entity_id"),
	CONSTRAINT "catalog_publications_revision_unique" UNIQUE("revision_id")
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "revision_target_kind" NOT NULL,
	"article_id" uuid,
	"catalog_entity_id" uuid,
	"sequence" integer NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_summary" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_revisions_id_article_unique" UNIQUE("id","article_id"),
	CONSTRAINT "content_revisions_id_catalog_unique" UNIQUE("id","catalog_entity_id"),
	CONSTRAINT "content_revisions_target_consistent" CHECK (("content_revisions"."target_kind" = 'article' and "content_revisions"."article_id" is not null and "content_revisions"."catalog_entity_id" is null) or ("content_revisions"."target_kind" = 'catalog_entity' and "content_revisions"."article_id" is null and "content_revisions"."catalog_entity_id" is not null)),
	CONSTRAINT "content_revisions_sequence_positive" CHECK ("content_revisions"."sequence" > 0),
	CONSTRAINT "content_revisions_schema_version_positive" CHECK ("content_revisions"."schema_version" > 0),
	CONSTRAINT "content_revisions_summary_length" CHECK (char_length("content_revisions"."change_summary") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "revision_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"event_type" "publication_event_type" NOT NULL,
	"from_revision_id" uuid,
	"to_revision_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_events_revision_shape" CHECK (("publication_events"."event_type" = 'published' and "publication_events"."to_revision_id" is not null) or ("publication_events"."event_type" = 'rolled_back' and "publication_events"."from_revision_id" is not null and "publication_events"."to_revision_id" is not null and "publication_events"."from_revision_id" <> "publication_events"."to_revision_id") or ("publication_events"."event_type" = 'archived' and "publication_events"."to_revision_id" is null)),
	CONSTRAINT "publication_events_reason_length" CHECK (char_length("publication_events"."reason") between 1 and 1000),
	CONSTRAINT "publication_events_request_id_length" CHECK (char_length("publication_events"."request_id") between 1 and 128)
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"decision" "review_decision" NOT NULL,
	"reason" text NOT NULL,
	"request_id" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_decisions_reason_length" CHECK (char_length("review_decisions"."reason") between 1 and 1000),
	CONSTRAINT "review_decisions_request_id_length" CHECK (char_length("review_decisions"."request_id") between 1 and 128)
);
--> statement-breakpoint
ALTER TABLE "article_publications" ADD CONSTRAINT "article_publications_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_publications" ADD CONSTRAINT "article_publications_revision_id_content_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_publications" ADD CONSTRAINT "article_publications_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_publications" ADD CONSTRAINT "article_publications_revision_target_fk" FOREIGN KEY ("revision_id","article_id") REFERENCES "public"."content_revisions"("id","article_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_publications" ADD CONSTRAINT "catalog_publications_catalog_entity_id_catalog_entities_id_fk" FOREIGN KEY ("catalog_entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_publications" ADD CONSTRAINT "catalog_publications_revision_id_content_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_publications" ADD CONSTRAINT "catalog_publications_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_publications" ADD CONSTRAINT "catalog_publications_revision_target_fk" FOREIGN KEY ("revision_id","catalog_entity_id") REFERENCES "public"."content_revisions"("id","catalog_entity_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_catalog_entity_id_catalog_entities_id_fk" FOREIGN KEY ("catalog_entity_id") REFERENCES "public"."catalog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_from_revision_id_content_revisions_id_fk" FOREIGN KEY ("from_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_to_revision_id_content_revisions_id_fk" FOREIGN KEY ("to_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_revision_id_content_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_state_updated_at_idx" ON "articles" USING btree ("state","updated_at");--> statement-breakpoint
CREATE INDEX "articles_created_by_idx" ON "articles" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_article_sequence_unique" ON "content_revisions" USING btree ("article_id","sequence") WHERE "content_revisions"."article_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_catalog_sequence_unique" ON "content_revisions" USING btree ("catalog_entity_id","sequence") WHERE "content_revisions"."catalog_entity_id" is not null;--> statement-breakpoint
CREATE INDEX "content_revisions_created_by_idx" ON "content_revisions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "publication_events_target_occurred_at_idx" ON "publication_events" USING btree ("target_kind","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "publication_events_actor_idx" ON "publication_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "review_decisions_revision_decided_at_idx" ON "review_decisions" USING btree ("revision_id","decided_at");--> statement-breakpoint
CREATE INDEX "review_decisions_reviewer_idx" ON "review_decisions" USING btree ("reviewer_user_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_append_only_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "content_revisions_append_only"
BEFORE UPDATE OR DELETE ON "content_revisions"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();--> statement-breakpoint
CREATE TRIGGER "review_decisions_append_only"
BEFORE UPDATE OR DELETE ON "review_decisions"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();--> statement-breakpoint
CREATE TRIGGER "publication_events_append_only"
BEFORE UPDATE OR DELETE ON "publication_events"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();

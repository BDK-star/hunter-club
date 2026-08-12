CREATE TABLE "revision_source_references" (
	"revision_id" uuid NOT NULL,
	"source_reference_id" uuid NOT NULL,
	CONSTRAINT "revision_source_references_revision_id_source_reference_id_pk" PRIMARY KEY("revision_id","source_reference_id")
);
--> statement-breakpoint
ALTER TABLE "revision_source_references" ADD CONSTRAINT "revision_source_references_revision_id_content_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_source_references" ADD CONSTRAINT "revision_source_references_source_reference_id_source_references_id_fk" FOREIGN KEY ("source_reference_id") REFERENCES "public"."source_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revision_source_references_source_idx" ON "revision_source_references" USING btree ("source_reference_id");
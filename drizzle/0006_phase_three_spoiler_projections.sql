DROP INDEX "search_documents_target_locale_unique";--> statement-breakpoint
DROP INDEX "search_documents_slug_locale_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_target_locale_unique" ON "search_documents" USING btree ("target_kind","target_id","locale","spoiler_level");--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_slug_locale_unique" ON "search_documents" USING btree ("slug","locale","spoiler_level");
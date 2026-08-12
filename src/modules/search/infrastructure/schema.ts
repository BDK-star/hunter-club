import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const searchTargetKind = pgEnum("search_target_kind", [
  "article",
  "catalog_entity",
]);
export const searchDocumentKind = pgEnum("search_document_kind", [
  "article",
  "character",
  "nen_ability",
  "organization",
  "story_arc",
]);
export const searchCanonStatus = pgEnum("search_canon_status", [
  "canon",
  "adaptation_supplement",
  "conflict",
  "unverified",
]);
export const searchSpoilerLevel = pgEnum("search_spoiler_level", [
  "safe",
  "anime",
  "manga",
]);

export const searchDocuments = pgTable(
  "search_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetKind: searchTargetKind("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    kind: searchDocumentKind("kind").notNull(),
    locale: text("locale").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    normalizedAliases: text("normalized_aliases").array().notNull(),
    body: text("body").notNull(),
    searchText: text("search_text").notNull(),
    canonStatus: searchCanonStatus("canon_status").notNull(),
    spoilerLevel: searchSpoilerLevel("spoiler_level").notNull(),
    projectionVersion: integer("projection_version").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    projectedAt: timestamp("projected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("search_documents_target_locale_unique").on(
      table.targetKind,
      table.targetId,
      table.locale,
      table.spoilerLevel,
    ),
    uniqueIndex("search_documents_slug_locale_unique").on(
      table.slug,
      table.locale,
      table.spoilerLevel,
    ),
    index("search_documents_filters_idx").on(
      table.kind,
      table.canonStatus,
      table.spoilerLevel,
    ),
    check(
      "search_documents_target_kind_consistent",
      sql`(${table.targetKind} = 'article' and ${table.kind} = 'article') or (${table.targetKind} = 'catalog_entity' and ${table.kind} <> 'article')`,
    ),
    check(
      "search_documents_locale_shape",
      sql`${table.locale} ~ '^[a-z]{2,3}(-[A-Z]{2})?$'`,
    ),
    check(
      "search_documents_projection_version_positive",
      sql`${table.projectionVersion} > 0`,
    ),
  ],
);

export const searchQueryMetrics = pgTable(
  "search_query_metrics",
  {
    id: serial("id").primaryKey(),
    queryFingerprint: text("query_fingerprint").notNull(),
    queryLength: integer("query_length").notNull(),
    filters: jsonb("filters")
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    resultCount: integer("result_count").notNull(),
    zeroResult: boolean("zero_result").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("search_query_metrics_occurred_at_idx").on(table.occurredAt),
    index("search_query_metrics_zero_result_idx").on(
      table.zeroResult,
      table.occurredAt,
    ),
    check(
      "search_query_metrics_fingerprint_shape",
      sql`${table.queryFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "search_query_metrics_query_length_range",
      sql`${table.queryLength} between 1 and 100`,
    ),
    check(
      "search_query_metrics_result_count_nonnegative",
      sql`${table.resultCount} >= 0`,
    ),
    check(
      "search_query_metrics_zero_result_consistent",
      sql`(${table.zeroResult} and ${table.resultCount} = 0) or (not ${table.zeroResult} and ${table.resultCount} > 0)`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const catalogEntityKind = pgEnum("catalog_entity_kind", [
  "character",
  "nen_ability",
  "organization",
  "story_arc",
]);
export const catalogEntityState = pgEnum("catalog_entity_state", [
  "draft",
  "active",
  "archived",
]);
export const catalogSourceType = pgEnum("catalog_source_type", [
  "manga",
  "anime_1999",
  "anime_2011",
  "film",
  "official_guide",
  "official_interview",
  "game",
  "other_official",
]);
export const sourceLocatorType = pgEnum("source_locator_type", [
  "chapter",
  "episode",
  "page",
  "section",
  "timestamp",
  "other",
]);
export const catalogCanonStatus = pgEnum("catalog_canon_status", [
  "canon",
  "adaptation_supplement",
  "conflict",
  "unverified",
]);
export const catalogSpoilerLevel = pgEnum("catalog_spoiler_level", [
  "safe",
  "anime",
  "manga",
]);
export const sourceAssertion = pgEnum("source_assertion", [
  "supports",
  "contradicts",
]);

export const catalogEntities = pgTable(
  "catalog_entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: catalogEntityKind("kind").notNull(),
    slug: text("slug").notNull(),
    state: catalogEntityState("state").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_entities_slug_unique").on(table.slug),
    index("catalog_entities_kind_state_idx").on(table.kind, table.state),
    index("catalog_entities_created_by_idx").on(table.createdByUserId),
    check(
      "catalog_entities_slug_shape",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_entities_archive_state",
      sql`(${table.state} = 'archived' and ${table.archivedAt} is not null) or (${table.state} <> 'archived' and ${table.archivedAt} is null)`,
    ),
  ],
);

export const entityTranslations = pgTable(
  "entity_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    summary: text("summary"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("entity_translations_entity_locale_unique").on(
      table.entityId,
      table.locale,
    ),
    uniqueIndex("entity_translations_one_primary_unique")
      .on(table.entityId)
      .where(sql`${table.isPrimary} = true`),
    index("entity_translations_locale_name_idx").on(table.locale, table.name),
    check(
      "entity_translations_locale_shape",
      sql`${table.locale} ~ '^[a-z]{2,3}(-[A-Z]{2})?$'`,
    ),
    check(
      "entity_translations_name_length",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "entity_translations_summary_length",
      sql`${table.summary} is null or char_length(${table.summary}) <= 1000`,
    ),
  ],
);

export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("entity_aliases_entity_locale_normalized_unique").on(
      table.entityId,
      table.locale,
      table.normalizedAlias,
    ),
    index("entity_aliases_normalized_idx").on(table.normalizedAlias),
    check(
      "entity_aliases_locale_shape",
      sql`${table.locale} ~ '^[a-z]{2,3}(-[A-Z]{2})?$'`,
    ),
    check(
      "entity_aliases_value_length",
      sql`char_length(${table.alias}) between 1 and 160 and char_length(${table.normalizedAlias}) between 1 and 160`,
    ),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: catalogSourceType("type").notNull(),
    title: text("title").notNull(),
    language: text("language").notNull(),
    publisher: text("publisher"),
    externalUrl: text("external_url"),
    publishedOn: date("published_on"),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sources_type_title_idx").on(table.type, table.title),
    index("sources_created_by_idx").on(table.createdByUserId),
    check(
      "sources_title_length",
      sql`char_length(${table.title}) between 1 and 300`,
    ),
    check(
      "sources_language_shape",
      sql`${table.language} ~ '^[a-z]{2,3}(-[A-Z]{2})?$'`,
    ),
    check(
      "sources_external_url_shape",
      sql`${table.externalUrl} is null or ${table.externalUrl} ~ '^https://'`,
    ),
  ],
);

export const sourceReferences = pgTable(
  "source_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    locatorType: sourceLocatorType("locator_type").notNull(),
    locator: text("locator").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("source_references_source_locator_unique").on(
      table.sourceId,
      table.locatorType,
      table.locator,
    ),
    index("source_references_source_id_idx").on(table.sourceId),
    check(
      "source_references_locator_length",
      sql`char_length(${table.locator}) between 1 and 160`,
    ),
    check(
      "source_references_note_length",
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
  ],
);

export const factClaims = pgTable(
  "fact_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    predicate: text("predicate").notNull(),
    statement: text("statement").notNull(),
    value: jsonb("value").$type<Readonly<Record<string, unknown>>>(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    canonStatus: catalogCanonStatus("canon_status").notNull(),
    spoilerLevel: catalogSpoilerLevel("spoiler_level").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("fact_claims_entity_spoiler_idx").on(
      table.entityId,
      table.spoilerLevel,
    ),
    index("fact_claims_predicate_idx").on(table.predicate),
    check(
      "fact_claims_predicate_shape",
      sql`${table.predicate} ~ '^[a-z][a-z0-9_.-]{0,99}$'`,
    ),
    check(
      "fact_claims_statement_length",
      sql`char_length(${table.statement}) between 1 and 2000`,
    ),
    check(
      "fact_claims_schema_version_positive",
      sql`${table.schemaVersion} > 0`,
    ),
    check("fact_claims_verified_not_future", sql`${table.verifiedAt} <= now()`),
  ],
);

export const claimSources = pgTable(
  "claim_sources",
  {
    claimId: uuid("claim_id")
      .notNull()
      .references(() => factClaims.id, { onDelete: "cascade" }),
    sourceReferenceId: uuid("source_reference_id")
      .notNull()
      .references(() => sourceReferences.id, { onDelete: "restrict" }),
    assertion: sourceAssertion("assertion").default("supports").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.claimId, table.sourceReferenceId] }),
    index("claim_sources_reference_idx").on(table.sourceReferenceId),
  ],
);

export const entityRelations = pgTable(
  "entity_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceEntityId: uuid("source_entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    targetEntityId: uuid("target_entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    canonStatus: catalogCanonStatus("canon_status").notNull(),
    spoilerLevel: catalogSpoilerLevel("spoiler_level").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("entity_relations_unique").on(
      table.sourceEntityId,
      table.targetEntityId,
      table.relationType,
      table.canonStatus,
    ),
    index("entity_relations_target_idx").on(table.targetEntityId),
    check(
      "entity_relations_distinct_entities",
      sql`${table.sourceEntityId} <> ${table.targetEntityId}`,
    ),
    check(
      "entity_relations_type_shape",
      sql`${table.relationType} ~ '^[a-z][a-z0-9_.-]{0,99}$'`,
    ),
    check(
      "entity_relations_verified_not_future",
      sql`${table.verifiedAt} <= now()`,
    ),
  ],
);

export const relationSources = pgTable(
  "relation_sources",
  {
    relationId: uuid("relation_id")
      .notNull()
      .references(() => entityRelations.id, { onDelete: "cascade" }),
    sourceReferenceId: uuid("source_reference_id")
      .notNull()
      .references(() => sourceReferences.id, { onDelete: "restrict" }),
    assertion: sourceAssertion("assertion").default("supports").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.relationId, table.sourceReferenceId] }),
    index("relation_sources_reference_idx").on(table.sourceReferenceId),
  ],
);

export const slugHistory = pgTable(
  "slug_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    replacedAt: timestamp("replaced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("slug_history_slug_unique").on(table.slug),
    index("slug_history_entity_id_idx").on(table.entityId),
    check(
      "slug_history_slug_shape",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
  ],
);

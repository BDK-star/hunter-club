import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
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

import { catalogEntities } from "@/modules/catalog/public";
import { users } from "@/modules/identity/public";

export const articleState = pgEnum("article_state", [
  "draft",
  "published",
  "archived",
]);
export const revisionTargetKind = pgEnum("revision_target_kind", [
  "article",
  "catalog_entity",
]);
export const reviewDecision = pgEnum("review_decision", [
  "approved",
  "changes_requested",
  "rejected",
]);
export const publicationEventType = pgEnum("publication_event_type", [
  "published",
  "rolled_back",
  "archived",
]);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    state: articleState("state").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("articles_slug_unique").on(table.slug),
    index("articles_state_updated_at_idx").on(table.state, table.updatedAt),
    index("articles_created_by_idx").on(table.createdByUserId),
    check(
      "articles_slug_shape",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "articles_archive_state",
      sql`(${table.state} = 'archived' and ${table.archivedAt} is not null) or (${table.state} <> 'archived' and ${table.archivedAt} is null)`,
    ),
  ],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetKind: revisionTargetKind("target_kind").notNull(),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    catalogEntityId: uuid("catalog_entity_id").references(
      () => catalogEntities.id,
      { onDelete: "cascade" },
    ),
    sequence: integer("sequence").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    snapshot: jsonb("snapshot")
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    changeSummary: text("change_summary").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("content_revisions_article_sequence_unique")
      .on(table.articleId, table.sequence)
      .where(sql`${table.articleId} is not null`),
    uniqueIndex("content_revisions_catalog_sequence_unique")
      .on(table.catalogEntityId, table.sequence)
      .where(sql`${table.catalogEntityId} is not null`),
    unique("content_revisions_id_article_unique").on(table.id, table.articleId),
    unique("content_revisions_id_catalog_unique").on(
      table.id,
      table.catalogEntityId,
    ),
    index("content_revisions_created_by_idx").on(table.createdByUserId),
    check(
      "content_revisions_target_consistent",
      sql`(${table.targetKind} = 'article' and ${table.articleId} is not null and ${table.catalogEntityId} is null) or (${table.targetKind} = 'catalog_entity' and ${table.articleId} is null and ${table.catalogEntityId} is not null)`,
    ),
    check("content_revisions_sequence_positive", sql`${table.sequence} > 0`),
    check(
      "content_revisions_schema_version_positive",
      sql`${table.schemaVersion} > 0`,
    ),
    check(
      "content_revisions_summary_length",
      sql`char_length(${table.changeSummary}) between 1 and 500`,
    ),
  ],
);

export const reviewDecisionsTable = pgTable(
  "review_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => contentRevisions.id, { onDelete: "restrict" }),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decision: reviewDecision("decision").notNull(),
    reason: text("reason").notNull(),
    requestId: text("request_id").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("review_decisions_revision_decided_at_idx").on(
      table.revisionId,
      table.decidedAt,
    ),
    index("review_decisions_reviewer_idx").on(table.reviewerUserId),
    uniqueIndex("review_decisions_request_id_unique").on(table.requestId),
    check(
      "review_decisions_reason_length",
      sql`char_length(${table.reason}) between 1 and 1000`,
    ),
    check(
      "review_decisions_request_id_length",
      sql`char_length(${table.requestId}) between 1 and 128`,
    ),
  ],
);

export const articlePublications = pgTable(
  "article_publications",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => contentRevisions.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId] }),
    unique("article_publications_revision_unique").on(table.revisionId),
    foreignKey({
      columns: [table.revisionId, table.articleId],
      foreignColumns: [contentRevisions.id, contentRevisions.articleId],
      name: "article_publications_revision_target_fk",
    }).onDelete("restrict"),
  ],
);

export const catalogPublications = pgTable(
  "catalog_publications",
  {
    catalogEntityId: uuid("catalog_entity_id")
      .notNull()
      .references(() => catalogEntities.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => contentRevisions.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.catalogEntityId] }),
    unique("catalog_publications_revision_unique").on(table.revisionId),
    foreignKey({
      columns: [table.revisionId, table.catalogEntityId],
      foreignColumns: [contentRevisions.id, contentRevisions.catalogEntityId],
      name: "catalog_publications_revision_target_fk",
    }).onDelete("restrict"),
  ],
);

export const publicationEvents = pgTable(
  "publication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetKind: revisionTargetKind("target_kind").notNull(),
    targetId: uuid("target_id").notNull(),
    eventType: publicationEventType("event_type").notNull(),
    fromRevisionId: uuid("from_revision_id").references(
      () => contentRevisions.id,
      { onDelete: "restrict" },
    ),
    toRevisionId: uuid("to_revision_id").references(() => contentRevisions.id, {
      onDelete: "restrict",
    }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestId: text("request_id").notNull(),
    reason: text("reason").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("publication_events_target_occurred_at_idx").on(
      table.targetKind,
      table.targetId,
      table.occurredAt,
    ),
    index("publication_events_actor_idx").on(table.actorUserId),
    uniqueIndex("publication_events_request_id_unique").on(table.requestId),
    check(
      "publication_events_revision_shape",
      sql`(${table.eventType} = 'published' and ${table.toRevisionId} is not null) or (${table.eventType} = 'rolled_back' and ${table.fromRevisionId} is not null and ${table.toRevisionId} is not null and ${table.fromRevisionId} <> ${table.toRevisionId}) or (${table.eventType} = 'archived' and ${table.toRevisionId} is null)`,
    ),
    check(
      "publication_events_reason_length",
      sql`char_length(${table.reason}) between 1 and 1000`,
    ),
    check(
      "publication_events_request_id_length",
      sql`char_length(${table.requestId}) between 1 and 128`,
    ),
  ],
);

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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

export const userStatus = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);
export const identityProvider = pgEnum("identity_provider", [
  "email_otp",
  "github",
]);
export const assuranceLevel = pgEnum("assurance_level", ["aal1", "aal2"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    status: userStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "users_display_name_length",
      sql`char_length(${table.displayName}) between 1 and 80`,
    ),
    check(
      "users_deleted_state_consistent",
      sql`(${table.status} = 'deleted' and ${table.deletedAt} is not null) or (${table.status} <> 'deleted' and ${table.deletedAt} is null)`,
    ),
  ],
);

export const identities = pgTable(
  "identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: identityProvider("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    emailNormalized: text("email_normalized"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastAuthenticatedAt: timestamp("last_authenticated_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    unique("identities_provider_subject_unique").on(
      table.provider,
      table.providerSubject,
    ),
    index("identities_user_id_idx").on(table.userId),
    index("identities_email_normalized_idx").on(table.emailNormalized),
    check(
      "identities_subject_not_blank",
      sql`char_length(${table.providerSubject}) between 1 and 255`,
    ),
    check(
      "identities_email_shape",
      sql`${table.emailNormalized} is null or (${table.emailNormalized} = lower(${table.emailNormalized}) and char_length(${table.emailNormalized}) between 3 and 320)`,
    ),
    check(
      "identities_email_otp_is_verified",
      sql`${table.provider} <> 'email_otp' or (${table.emailNormalized} is not null and ${table.emailVerifiedAt} is not null)`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenDigest: text("token_digest").notNull(),
    assuranceLevel: assuranceLevel("assurance_level").default("aal1").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sessions_token_digest_unique").on(table.tokenDigest),
    index("sessions_user_id_expires_at_idx").on(table.userId, table.expiresAt),
    check(
      "sessions_token_digest_shape",
      sql`${table.tokenDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "sessions_expiry_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "sessions_maximum_lifetime",
      sql`${table.expiresAt} <= ${table.createdAt} + interval '30 days'`,
    ),
    check(
      "sessions_last_seen_not_before_creation",
      sql`${table.lastSeenAt} >= ${table.createdAt}`,
    ),
  ],
);

export const rolesTable = pgTable("roles", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  requiresSecondFactor: boolean("requires_second_factor")
    .default(false)
    .notNull(),
});

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleKey: text("role_key")
      .notNull()
      .references(() => rolesTable.key, { onDelete: "restrict" }),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleKey] }),
    index("user_roles_role_key_idx").on(table.roleKey),
    check(
      "user_roles_expiry_after_assignment",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.assignedAt}`,
    ),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => rolesTable.key, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleKey, table.permissionKey] }),
    index("role_permissions_permission_key_idx").on(table.permissionKey),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestId: text("request_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Readonly<Record<string, unknown>>>()
      .default({})
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("security_events_actor_occurred_at_idx").on(
      table.actorUserId,
      table.occurredAt,
    ),
    index("security_events_target_occurred_at_idx").on(
      table.targetUserId,
      table.occurredAt,
    ),
    check(
      "security_events_type_not_blank",
      sql`char_length(${table.eventType}) between 1 and 100`,
    ),
    check(
      "security_events_request_id_not_blank",
      sql`char_length(${table.requestId}) between 1 and 128`,
    ),
  ],
);

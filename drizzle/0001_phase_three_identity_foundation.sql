CREATE TYPE "public"."assurance_level" AS ENUM('aal1', 'aal2');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('email_otp', 'github');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_subject" text NOT NULL,
	"email_normalized" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_authenticated_at" timestamp with time zone,
	CONSTRAINT "identities_provider_subject_unique" UNIQUE("provider","provider_subject"),
	CONSTRAINT "identities_subject_not_blank" CHECK (char_length("identities"."provider_subject") between 1 and 255),
	CONSTRAINT "identities_email_shape" CHECK ("identities"."email_normalized" is null or ("identities"."email_normalized" = lower("identities"."email_normalized") and char_length("identities"."email_normalized") between 3 and 320)),
	CONSTRAINT "identities_email_otp_is_verified" CHECK ("identities"."provider" <> 'email_otp' or ("identities"."email_normalized" is not null and "identities"."email_verified_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_key" text NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_key_permission_key_pk" PRIMARY KEY("role_key","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"requires_second_factor" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"request_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_events_type_not_blank" CHECK (char_length("security_events"."event_type") between 1 and 100),
	CONSTRAINT "security_events_request_id_not_blank" CHECK (char_length("security_events"."request_id") between 1 and 128)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"assurance_level" "assurance_level" DEFAULT 'aal1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_digest_shape" CHECK ("sessions"."token_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_expiry_after_creation" CHECK ("sessions"."expires_at" > "sessions"."created_at"),
	CONSTRAINT "sessions_maximum_lifetime" CHECK ("sessions"."expires_at" <= "sessions"."created_at" + interval '30 days'),
	CONSTRAINT "sessions_last_seen_not_before_creation" CHECK ("sessions"."last_seen_at" >= "sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"assigned_by_user_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "user_roles_user_id_role_key_pk" PRIMARY KEY("user_id","role_key"),
	CONSTRAINT "user_roles_expiry_after_assignment" CHECK ("user_roles"."expires_at" is null or "user_roles"."expires_at" > "user_roles"."assigned_at")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_display_name_length" CHECK (char_length("users"."display_name") between 1 and 80),
	CONSTRAINT "users_deleted_state_consistent" CHECK (("users"."status" = 'deleted' and "users"."deleted_at" is not null) or ("users"."status" <> 'deleted' and "users"."deleted_at" is null))
);
--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identities_email_normalized_idx" ON "identities" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions" USING btree ("permission_key");--> statement-breakpoint
CREATE INDEX "security_events_actor_occurred_at_idx" ON "security_events" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "security_events_target_occurred_at_idx" ON "security_events" USING btree ("target_user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_digest_unique" ON "sessions" USING btree ("token_digest");--> statement-breakpoint
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "user_roles_role_key_idx" ON "user_roles" USING btree ("role_key");--> statement-breakpoint
INSERT INTO "roles" ("key", "description", "requires_second_factor") VALUES
	('member', '收藏、评论、投稿、纠错和举报', false),
	('contributor', '创建结构化资料草稿和修订', false),
	('editor', '审核、发布、归档和回退内容', true),
	('moderator', '处理评论、举报、处罚和申诉', true),
	('admin', '管理角色、关键配置和高风险操作', true);--> statement-breakpoint
INSERT INTO "permissions" ("key", "description") VALUES
	('content.submit', '提交普通投稿'),
	('catalog.draft', '创建结构化资料草稿'),
	('content.review', '审核内容修订'),
	('content.publish', '发布内容修订'),
	('content.rollback', '回退到历史修订'),
	('moderation.case.manage', '处理举报案件'),
	('identity.role.assign', '分配用户角色');--> statement-breakpoint
INSERT INTO "role_permissions" ("role_key", "permission_key") VALUES
	('member', 'content.submit'),
	('contributor', 'content.submit'),
	('contributor', 'catalog.draft'),
	('editor', 'content.submit'),
	('editor', 'catalog.draft'),
	('editor', 'content.review'),
	('editor', 'content.publish'),
	('editor', 'content.rollback'),
	('moderator', 'content.submit'),
	('moderator', 'moderation.case.manage'),
	('admin', 'content.submit'),
	('admin', 'catalog.draft'),
	('admin', 'content.review'),
	('admin', 'content.publish'),
	('admin', 'content.rollback'),
	('admin', 'moderation.case.manage'),
	('admin', 'identity.role.assign');

import {
  canonStatuses,
  catalogEntityKinds,
  spoilerLevels,
  type CanonStatus,
  type CatalogEntityKind,
  type CatalogSpoilerLevel,
} from "@/modules/catalog/public";

export type ArticleRevisionSnapshotV1 = Readonly<{
  aliases: readonly string[];
  body: string;
  canonStatus: CanonStatus;
  locale: string;
  spoilerLevel: CatalogSpoilerLevel;
  title: string;
  type: "article";
}>;

export type CatalogRevisionSnapshotV1 = Readonly<{
  facts: readonly Readonly<{
    canonStatus: CanonStatus;
    sourceReferenceIds: readonly string[];
    spoilerLevel: CatalogSpoilerLevel;
    statement: string;
  }>[];
  kind: CatalogEntityKind;
  translations: readonly Readonly<{
    aliases: readonly string[];
    locale: string;
    summary: string;
    title: string;
  }>[];
  type: "catalog_entity";
}>;

export type PublishedRevisionSnapshot =
  | ArticleRevisionSnapshotV1
  | CatalogRevisionSnapshotV1;

export type RevisionSnapshotIssue = Readonly<{
  code: string;
  path: string;
}>;

const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

export function parsePublishedRevisionSnapshot(
  value: unknown,
):
  | Readonly<{ issues: readonly RevisionSnapshotIssue[]; ok: false }>
  | Readonly<{ ok: true; value: PublishedRevisionSnapshot }> {
  const issues: RevisionSnapshotIssue[] = [];
  if (!isRecord(value)) return invalid("snapshot_not_object", "snapshot");

  if (value.type === "article") {
    validateArticle(value, issues);
  } else if (value.type === "catalog_entity") {
    validateCatalog(value, issues);
  } else {
    issues.push({ code: "unknown_snapshot_type", path: "type" });
  }

  return issues.length > 0
    ? { issues, ok: false }
    : { ok: true, value: value as PublishedRevisionSnapshot };
}

function validateArticle(
  value: Record<string, unknown>,
  issues: RevisionSnapshotIssue[],
) {
  validateLocale(value.locale, "locale", issues);
  validateText(value.title, "title", 1, 200, issues);
  validateText(value.body, "body", 1, 100_000, issues);
  validateStringArray(value.aliases, "aliases", issues);
  validateEnum(value.canonStatus, canonStatuses, "canonStatus", issues);
  validateEnum(value.spoilerLevel, spoilerLevels, "spoilerLevel", issues);
  if (value.canonStatus === "unverified") {
    issues.push({ code: "unverified_content", path: "canonStatus" });
  }
}

function validateCatalog(
  value: Record<string, unknown>,
  issues: RevisionSnapshotIssue[],
) {
  validateEnum(value.kind, catalogEntityKinds, "kind", issues);
  if (!Array.isArray(value.translations) || value.translations.length === 0) {
    issues.push({ code: "missing_translations", path: "translations" });
  } else {
    const locales = new Set<string>();
    value.translations.forEach((translation, index) => {
      if (!isRecord(translation)) {
        issues.push({
          code: "translation_not_object",
          path: `translations.${index}`,
        });
        return;
      }
      validateLocale(
        translation.locale,
        `translations.${index}.locale`,
        issues,
      );
      validateText(
        translation.title,
        `translations.${index}.title`,
        1,
        200,
        issues,
      );
      validateText(
        translation.summary,
        `translations.${index}.summary`,
        0,
        2_000,
        issues,
      );
      validateStringArray(
        translation.aliases,
        `translations.${index}.aliases`,
        issues,
      );
      if (typeof translation.locale === "string") {
        if (locales.has(translation.locale)) {
          issues.push({
            code: "duplicate_locale",
            path: `translations.${index}.locale`,
          });
        }
        locales.add(translation.locale);
      }
    });
  }

  if (!Array.isArray(value.facts)) {
    issues.push({ code: "facts_not_array", path: "facts" });
  } else if (value.facts.length === 0) {
    issues.push({ code: "missing_facts", path: "facts" });
  } else {
    value.facts.forEach((fact, index) => {
      if (!isRecord(fact)) {
        issues.push({ code: "fact_not_object", path: `facts.${index}` });
        return;
      }
      validateText(
        fact.statement,
        `facts.${index}.statement`,
        1,
        5_000,
        issues,
      );
      validateEnum(
        fact.canonStatus,
        canonStatuses,
        `facts.${index}.canonStatus`,
        issues,
      );
      validateEnum(
        fact.spoilerLevel,
        spoilerLevels,
        `facts.${index}.spoilerLevel`,
        issues,
      );
      validateStringArray(
        fact.sourceReferenceIds,
        `facts.${index}.sourceReferenceIds`,
        issues,
      );
      if (
        Array.isArray(fact.sourceReferenceIds) &&
        fact.sourceReferenceIds.length === 0
      ) {
        issues.push({
          code: "fact_missing_source",
          path: `facts.${index}.sourceReferenceIds`,
        });
      }
      if (fact.canonStatus === "unverified") {
        issues.push({
          code: "unverified_content",
          path: `facts.${index}.canonStatus`,
        });
      }
    });
  }
}

function validateLocale(
  value: unknown,
  path: string,
  issues: RevisionSnapshotIssue[],
) {
  if (typeof value !== "string" || !localePattern.test(value)) {
    issues.push({ code: "invalid_locale", path });
  }
}

function validateText(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  issues: RevisionSnapshotIssue[],
) {
  if (
    typeof value !== "string" ||
    value.trim().length < minimum ||
    value.length > maximum
  ) {
    issues.push({ code: "invalid_text", path });
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: RevisionSnapshotIssue[],
) {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !item.trim() || item.length > 200,
    )
  ) {
    issues.push({ code: "invalid_string_array", path });
  }
}

function validateEnum<const T extends readonly string[]>(
  value: unknown,
  accepted: T,
  path: string,
  issues: RevisionSnapshotIssue[],
) {
  if (typeof value !== "string" || !accepted.includes(value)) {
    issues.push({ code: "invalid_enum", path });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(code: string, path: string) {
  return { issues: [{ code, path }], ok: false } as const;
}

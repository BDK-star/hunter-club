export const catalogEntityKinds = [
  "character",
  "nen_ability",
  "organization",
  "story_arc",
] as const;

export type CatalogEntityKind = (typeof catalogEntityKinds)[number];

export const sourceTypes = [
  "manga",
  "anime_1999",
  "anime_2011",
  "film",
  "official_guide",
  "official_interview",
  "game",
  "other_official",
] as const;

export type SourceType = (typeof sourceTypes)[number];

export const canonStatuses = [
  "canon",
  "adaptation_supplement",
  "conflict",
  "unverified",
] as const;

export type CanonStatus = (typeof canonStatuses)[number];

export const spoilerLevels = ["safe", "anime", "manga"] as const;
export type CatalogSpoilerLevel = (typeof spoilerLevels)[number];

export type CatalogTranslationDraft = Readonly<{
  locale: string;
  name: string;
  summary?: string;
}>;

export type SourcedFactDraft = Readonly<{
  canonStatus: CanonStatus;
  sourceReferenceIds: readonly string[];
  spoilerLevel: CatalogSpoilerLevel;
  statement: string;
  verifiedAt: Date;
}>;

export type CatalogPublicationDraft = Readonly<{
  facts: readonly SourcedFactDraft[];
  kind: CatalogEntityKind;
  slug: string;
  translations: readonly CatalogTranslationDraft[];
}>;

export type SourcedRelationDraft = Readonly<{
  canonStatus: CanonStatus;
  relationType: string;
  sourceEntityId: string;
  sourceReferenceIds: readonly string[];
  spoilerLevel: CatalogSpoilerLevel;
  targetEntityId: string;
  verifiedAt: Date;
}>;

export type CatalogDraftIssue = Readonly<{
  code:
    | "duplicate_locale"
    | "fact_missing_source"
    | "invalid_locale"
    | "invalid_slug"
    | "missing_translation"
    | "relation_missing_source"
    | "self_relation"
    | "unverified_fact"
    | "unverified_relation"
    | "unverified_timestamp";
  path: string;
}>;

const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const spoilerRank: Readonly<Record<CatalogSpoilerLevel, number>> = {
  safe: 0,
  anime: 1,
  manga: 2,
};

export function normalizeCatalogSearchTerm(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("und")
    .replace(/\s+/g, " ");
}

export function isVisibleAtSpoilerLevel(
  contentLevel: CatalogSpoilerLevel,
  readerLevel: CatalogSpoilerLevel,
): boolean {
  return spoilerRank[contentLevel] <= spoilerRank[readerLevel];
}

export function validateCatalogPublicationDraft(
  draft: CatalogPublicationDraft,
): readonly CatalogDraftIssue[] {
  const issues: CatalogDraftIssue[] = [];

  if (!slugPattern.test(draft.slug)) {
    issues.push({ code: "invalid_slug", path: "slug" });
  }

  if (draft.translations.length === 0) {
    issues.push({ code: "missing_translation", path: "translations" });
  }

  const locales = new Set<string>();
  draft.translations.forEach((translation, index) => {
    if (!localePattern.test(translation.locale)) {
      issues.push({
        code: "invalid_locale",
        path: `translations.${index}.locale`,
      });
    }
    if (locales.has(translation.locale)) {
      issues.push({
        code: "duplicate_locale",
        path: `translations.${index}.locale`,
      });
    }
    locales.add(translation.locale);
  });

  draft.facts.forEach((fact, index) => {
    if (fact.sourceReferenceIds.length === 0) {
      issues.push({
        code: "fact_missing_source",
        path: `facts.${index}.sourceReferenceIds`,
      });
    }
    if (fact.canonStatus === "unverified") {
      issues.push({
        code: "unverified_fact",
        path: `facts.${index}.canonStatus`,
      });
    }
    if (fact.verifiedAt.getTime() > Date.now()) {
      issues.push({
        code: "unverified_timestamp",
        path: `facts.${index}.verifiedAt`,
      });
    }
  });

  return issues;
}

export function validateSourcedRelationDraft(
  relation: SourcedRelationDraft,
): readonly CatalogDraftIssue[] {
  const issues: CatalogDraftIssue[] = [];

  if (relation.sourceEntityId === relation.targetEntityId) {
    issues.push({ code: "self_relation", path: "targetEntityId" });
  }
  if (relation.sourceReferenceIds.length === 0) {
    issues.push({
      code: "relation_missing_source",
      path: "sourceReferenceIds",
    });
  }
  if (relation.canonStatus === "unverified") {
    issues.push({ code: "unverified_relation", path: "canonStatus" });
  }
  if (relation.verifiedAt.getTime() > Date.now()) {
    issues.push({ code: "unverified_timestamp", path: "verifiedAt" });
  }

  return issues;
}

import type {
  CanonStatus,
  CatalogEntityKind,
  CatalogSpoilerLevel,
} from "@/modules/catalog/public";

export const searchDocumentKinds = [
  "article",
  "character",
  "nen_ability",
  "organization",
  "story_arc",
] as const;
export type SearchDocumentKind = (typeof searchDocumentKinds)[number];

export type SearchQuery = Readonly<{
  canonStatuses?: readonly CanonStatus[];
  kinds?: readonly SearchDocumentKind[];
  limit?: number;
  locale?: string;
  maxSpoilerLevel: CatalogSpoilerLevel;
  term: string;
}>;

export type SearchResult = Readonly<{
  canonStatus: CanonStatus;
  excerpt: string;
  kind: SearchDocumentKind;
  locale: string;
  revisionId: string;
  slug: string;
  spoilerLevel: CatalogSpoilerLevel;
  targetId: string;
  title: string;
}>;

export type PublishedSearchDocument = SearchResult & Readonly<{ body: string }>;

export interface SearchService {
  findPublishedBySlug(input: {
    locale: string;
    maxSpoilerLevel: CatalogSpoilerLevel;
    slug: string;
  }): Promise<PublishedSearchDocument | null>;
  search(query: SearchQuery): Promise<readonly SearchResult[]>;
}

export type SearchQueryIssue =
  | "empty_term"
  | "invalid_limit"
  | "invalid_locale"
  | "term_too_long";

const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

export function validateSearchQuery(
  query: SearchQuery,
): readonly SearchQueryIssue[] {
  const issues: SearchQueryIssue[] = [];
  const term = query.term.normalize("NFKC").trim();

  if (!term) issues.push("empty_term");
  if (term.length > 100) issues.push("term_too_long");
  if (query.limit !== undefined && (query.limit < 1 || query.limit > 50)) {
    issues.push("invalid_limit");
  }
  if (query.locale !== undefined && !localePattern.test(query.locale)) {
    issues.push("invalid_locale");
  }

  return issues;
}

export function catalogKindToSearchKind(
  kind: CatalogEntityKind,
): SearchDocumentKind {
  return kind;
}

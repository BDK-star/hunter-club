import {
  normalizeCatalogSearchTerm,
  type CanonStatus,
  type CatalogSpoilerLevel,
} from "@/modules/catalog/public";

import type { SearchDocumentKind } from "../domain/search";

export type PublishedSearchSource = Readonly<{
  aliases: readonly string[];
  body: string;
  canonStatus: CanonStatus;
  kind: SearchDocumentKind;
  locale: string;
  publishedAt: Date;
  revisionId: string;
  slug: string;
  spoilerLevel: CatalogSpoilerLevel;
  targetId: string;
  targetKind: "article" | "catalog_entity";
  title: string;
}>;

export type SearchProjectionDocument = PublishedSearchSource &
  Readonly<{
    normalizedAliases: readonly string[];
    normalizedTitle: string;
    projectionVersion: 1;
    searchText: string;
  }>;

export interface PublishedSearchSourceReader {
  readAllPublished(): AsyncIterable<PublishedSearchSource>;
}

export interface SearchProjectionWriter {
  /** Replace the complete projection atomically, normally through a staging table. */
  replaceAll(documents: readonly SearchProjectionDocument[]): Promise<void>;
}

export function buildSearchProjectionDocument(
  source: PublishedSearchSource,
): SearchProjectionDocument {
  const normalizedTitle = normalizeCatalogSearchTerm(source.title);
  const normalizedAliases = source.aliases
    .map(normalizeCatalogSearchTerm)
    .filter(
      (alias, index, aliases) => alias && aliases.indexOf(alias) === index,
    );
  const normalizedBody = normalizeCatalogSearchTerm(source.body);

  return {
    ...source,
    normalizedAliases,
    normalizedTitle,
    projectionVersion: 1,
    searchText: [normalizedTitle, ...normalizedAliases, normalizedBody]
      .filter(Boolean)
      .join(" "),
  };
}

export async function rebuildSearchProjection(
  reader: PublishedSearchSourceReader,
  writer: SearchProjectionWriter,
): Promise<number> {
  const documents: SearchProjectionDocument[] = [];
  for await (const source of reader.readAllPublished()) {
    documents.push(buildSearchProjectionDocument(source));
  }
  await writer.replaceAll(documents);
  return documents.length;
}

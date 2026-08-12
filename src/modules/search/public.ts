export {
  catalogKindToSearchKind,
  searchDocumentKinds,
  validateSearchQuery,
  type SearchDocumentKind,
  type SearchQuery,
  type SearchQueryIssue,
  type SearchResult,
  type SearchService,
} from "./domain/search";
export {
  buildSearchProjectionDocument,
  rebuildSearchProjection,
  type PublishedSearchSource,
  type PublishedSearchSourceReader,
  type SearchProjectionDocument,
  type SearchProjectionWriter,
} from "./application/projection";
export {
  createAnonymousSearchMetric,
  type AnonymousSearchMetric,
} from "./application/query-metric";
export {
  searchCanonStatus,
  searchDocumentKind,
  searchDocuments,
  searchQueryMetrics,
  searchSpoilerLevel,
  searchTargetKind,
} from "./infrastructure/schema";

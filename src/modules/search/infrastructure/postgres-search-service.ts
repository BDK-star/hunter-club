import "server-only";

import type { Sql } from "postgres";

import {
  createAnonymousSearchMetric,
  type AnonymousSearchMetric,
} from "../application/query-metric";
import {
  validateSearchQuery,
  type PublishedSearchDocument,
  type SearchQuery,
  type SearchResult,
  type SearchService,
} from "../domain/search";

type SearchRow = Readonly<{
  body: string;
  canon_status: SearchResult["canonStatus"];
  kind: SearchResult["kind"];
  locale: string;
  revision_id: string;
  slug: string;
  spoiler_level: SearchResult["spoilerLevel"];
  target_id: string;
  title: string;
}>;

const spoilerRank = { anime: 1, manga: 2, safe: 0 } as const;

export class PostgresSearchService implements SearchService {
  constructor(
    private readonly sql: Sql,
    private readonly metricFingerprintKey: string | null,
  ) {}

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    const issues = validateSearchQuery(query);
    if (issues.length > 0) throw new Error(`invalid search query: ${issues}`);

    const term = query.term.normalize("NFKC").trim().toLocaleLowerCase("und");
    const contains = `%${escapeLike(term)}%`;
    const prefix = `${escapeLike(term)}%`;
    const limit = query.limit ?? 20;
    const kinds = [...(query.kinds ?? [])];
    const canonStatuses = [...(query.canonStatuses ?? [])];
    const rows = await this.sql<SearchRow[]>`
      with visible_documents as (
        select *, row_number() over (
          partition by target_kind, target_id, locale
          order by case spoiler_level
            when 'safe' then 0
            when 'anime' then 1
            when 'manga' then 2
          end desc
        ) as visibility_rank
        from search_documents
        where case spoiler_level
          when 'safe' then 0
          when 'anime' then 1
          when 'manga' then 2
        end <= ${spoilerRank[query.maxSpoilerLevel]}
      )
      select
        target_id,
        revision_id,
        kind,
        locale,
        slug,
        title,
        body,
        canon_status,
        spoiler_level
      from visible_documents
      where (
        normalized_title = ${term}
        or ${term} = any(normalized_aliases)
        or normalized_title ilike ${prefix} escape '\\'
        or search_text ilike ${contains} escape '\\'
        or search_text % ${term}
      )
        and visibility_rank = 1
        and (${query.locale ?? null}::text is null or locale = ${query.locale ?? null})
        and (${kinds.length} = 0 or kind::text = any(${this.sql.array(kinds)}::text[]))
        and (${canonStatuses.length} = 0 or canon_status::text = any(${this.sql.array(canonStatuses)}::text[]))
      order by
        (normalized_title = ${term}) desc,
        (${term} = any(normalized_aliases)) desc,
        (normalized_title ilike ${prefix} escape '\\') desc,
        similarity(search_text, ${term}) desc,
        published_at desc,
        title asc
      limit ${limit}
    `;
    const results = rows.map(toSearchResult);
    await this.recordMetric(query, results.length);
    return results;
  }

  async findPublishedBySlug(input: {
    locale: string;
    maxSpoilerLevel: SearchResult["spoilerLevel"];
    slug: string;
  }): Promise<PublishedSearchDocument | null> {
    const rows = await this.sql<SearchRow[]>`
      select
        target_id,
        revision_id,
        kind,
        locale,
        slug,
        title,
        body,
        canon_status,
        spoiler_level
      from search_documents
      where slug = ${input.slug}
        and locale = ${input.locale}
        and case spoiler_level
          when 'safe' then 0
          when 'anime' then 1
          when 'manga' then 2
        end <= ${spoilerRank[input.maxSpoilerLevel]}
      order by case spoiler_level
        when 'safe' then 0
        when 'anime' then 1
        when 'manga' then 2
      end desc
      limit 1
    `;
    return rows[0] ? { ...toSearchResult(rows[0]), body: rows[0].body } : null;
  }

  private async recordMetric(
    query: SearchQuery,
    resultCount: number,
  ): Promise<void> {
    if (!this.metricFingerprintKey) return;
    const metric = createAnonymousSearchMetric(
      query,
      resultCount,
      this.metricFingerprintKey,
    );
    try {
      await insertMetric(this.sql, metric);
    } catch {
      // Metrics must never turn a public read into an outage.
    }
  }
}

async function insertMetric(sql: Sql, metric: AnonymousSearchMetric) {
  await sql`
    insert into search_query_metrics (
      query_fingerprint,
      query_length,
      filters,
      result_count,
      zero_result
    ) values (
      ${metric.queryFingerprint},
      ${metric.queryLength},
      ${sql.json(metric.filters)},
      ${metric.resultCount},
      ${metric.zeroResult}
    )
  `;
}

function toSearchResult(row: SearchRow): SearchResult {
  return {
    canonStatus: row.canon_status,
    excerpt: row.body.slice(0, 240),
    kind: row.kind,
    locale: row.locale,
    revisionId: row.revision_id,
    slug: row.slug,
    spoilerLevel: row.spoiler_level,
    targetId: row.target_id,
    title: row.title,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

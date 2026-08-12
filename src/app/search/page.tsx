import type { Metadata } from "next";
import Link from "next/link";

import {
  spoilerLevels,
  type CatalogSpoilerLevel,
} from "@/modules/catalog/public";
import {
  searchDocumentKinds,
  validateSearchQuery,
  type SearchDocumentKind,
  type SearchResult,
} from "@/modules/search/public";
import { getRuntimeSearchService } from "@/platform/search/runtime";

export const metadata: Metadata = {
  description: "按名称、别名、类型、正典状态与剧透边界检索已发布资料。",
  title: "搜索资料",
};

const kindLabels: Readonly<Record<SearchDocumentKind, string>> = {
  article: "专题文章",
  character: "角色",
  nen_ability: "念能力",
  organization: "组织",
  story_arc: "篇章",
};
const spoilerLabels: Readonly<Record<CatalogSpoilerLevel, string>> = {
  anime: "动画进度",
  manga: "漫画进度",
  safe: "低剧透",
};

type SearchPageProps = Readonly<{
  searchParams: Promise<{
    kind?: string | string[];
    q?: string | string[];
    spoilers?: string | string[];
  }>;
}>;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const parameters = await searchParams;
  const term = single(parameters.q)?.slice(0, 100) ?? "";
  const maxSpoilerLevel = parseSpoilerLevel(single(parameters.spoilers));
  const kind = parseKind(single(parameters.kind));
  let results: readonly SearchResult[] = [];
  let failed = false;

  if (term.trim()) {
    const query = {
      ...(kind ? { kinds: [kind] } : {}),
      limit: 20,
      locale: "zh-CN",
      maxSpoilerLevel,
      term,
    };
    if (validateSearchQuery(query).length === 0) {
      try {
        results = await getRuntimeSearchService().search(query);
      } catch {
        failed = true;
      }
    }
  }

  return (
    <main className="search-page">
      <header className="site-header library-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link href="/">门外</Link>
          <Link href="/saloon">大厅</Link>
          <Link href="/library">资料库</Link>
          <Link aria-current="page" href="/search">
            搜索
          </Link>
        </nav>
      </header>

      <section className="search-workbench" aria-labelledby="search-title">
        <header>
          <p className="eyebrow">PUBLIC ARCHIVE · INDEX DESK</p>
          <h1 id="search-title">从名字、别名或线索开始。</h1>
          <p className="lede">只查询已经出版、且不超过当前剧透边界的资料。</p>
        </header>

        <form action="/search" className="search-form" method="get">
          <label htmlFor="search-term">名称、别名或正文线索</label>
          <input
            defaultValue={term}
            id="search-term"
            maxLength={100}
            name="q"
            placeholder="例如：小杰、ゴン、猎人考试"
            required
            type="search"
          />
          <label htmlFor="search-kind">内容类型</label>
          <select defaultValue={kind ?? ""} id="search-kind" name="kind">
            <option value="">全部类型</option>
            {searchDocumentKinds.map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </select>
          <label htmlFor="search-spoilers">剧透边界</label>
          <select
            defaultValue={maxSpoilerLevel}
            id="search-spoilers"
            name="spoilers"
          >
            {spoilerLevels.map((value) => (
              <option key={value} value={value}>
                {spoilerLabels[value]}
              </option>
            ))}
          </select>
          <button className="primary-action" type="submit">
            检索已出版资料
          </button>
        </form>

        <div aria-live="polite" className="search-results">
          {failed ? (
            <p className="auth-error">
              索引台暂时不可用。资料库导览和其他公开页面仍可直接访问。
            </p>
          ) : term.trim() && results.length === 0 ? (
            <p className="search-empty">
              没有符合当前类型与剧透边界的已出版资料。试试别名，或明确提高剧透范围。
            </p>
          ) : (
            <ol>
              {results.map((result) => (
                <li key={`${result.targetId}:${result.locale}`}>
                  <p className="eyebrow">
                    {kindLabels[result.kind]} ·{" "}
                    {spoilerLabels[result.spoilerLevel]}
                  </p>
                  <h2>
                    <Link href={resultHref(result, maxSpoilerLevel)}>
                      {result.title}
                    </Link>
                  </h2>
                  <p>{result.excerpt}</p>
                  <small>正典标记：{result.canonStatus}</small>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function parseSpoilerLevel(value: string | null): CatalogSpoilerLevel {
  return spoilerLevels.includes(value as CatalogSpoilerLevel)
    ? (value as CatalogSpoilerLevel)
    : "safe";
}

function parseKind(value: string | null): SearchDocumentKind | null {
  return searchDocumentKinds.includes(value as SearchDocumentKind)
    ? (value as SearchDocumentKind)
    : null;
}

function resultHref(
  result: SearchResult,
  spoilers: CatalogSpoilerLevel,
): string {
  const prefix = result.kind === "article" ? "/articles" : "/library";
  return `${prefix}/${result.slug}?spoilers=${spoilers}`;
}

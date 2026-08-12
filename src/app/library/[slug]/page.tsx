import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  spoilerLevels,
  type CatalogSpoilerLevel,
} from "@/modules/catalog/public";
import { getRuntimeSearchService } from "@/platform/search/runtime";

type CatalogPageProps = Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ spoilers?: string | string[] }>;
}>;

export async function generateMetadata({
  params,
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const entry = await loadCatalogEntry(params, searchParams);
  return entry
    ? { description: entry.excerpt, title: entry.title }
    : { title: "资料不存在" };
}

export default async function CatalogEntryPage({
  params,
  searchParams,
}: CatalogPageProps) {
  const entry = await loadCatalogEntry(params, searchParams);
  if (!entry) notFound();

  return (
    <main className="library-page">
      <header className="site-header library-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link href="/">门外</Link>
          <Link href="/saloon">大厅</Link>
          <Link href="/library">资料库</Link>
          <Link href="/search">搜索</Link>
        </nav>
      </header>

      <article className="library-article published-entry">
        <header>
          <p className="eyebrow">
            PUBLISHED RECORD · {entry.kind} · {entry.spoilerLevel}
          </p>
          <h1>{entry.title}</h1>
          <p className="lede">正典标记：{entry.canonStatus}</p>
        </header>
        <div className="published-body">
          {entry.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <footer className="article-actions">
          <Link className="primary-action" href="/search">
            返回索引台
          </Link>
          <Link className="text-link" href="/library">
            资料库导览
          </Link>
        </footer>
      </article>
    </main>
  );
}

async function loadCatalogEntry(
  paramsPromise: CatalogPageProps["params"],
  searchParamsPromise: CatalogPageProps["searchParams"],
) {
  const [{ slug }, searchParameters] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);
  const rawSpoilers = Array.isArray(searchParameters.spoilers)
    ? searchParameters.spoilers[0]
    : searchParameters.spoilers;
  const maxSpoilerLevel = spoilerLevels.includes(
    rawSpoilers as CatalogSpoilerLevel,
  )
    ? (rawSpoilers as CatalogSpoilerLevel)
    : "safe";

  try {
    const entry = await getRuntimeSearchService().findPublishedBySlug({
      locale: "zh-CN",
      maxSpoilerLevel,
      slug,
    });
    return entry?.kind === "article" ? null : entry;
  } catch {
    return null;
  }
}

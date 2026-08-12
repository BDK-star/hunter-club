import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  spoilerLevels,
  type CatalogSpoilerLevel,
} from "@/modules/catalog/public";
import { getRuntimeSearchService } from "@/platform/search/runtime";

type ArticlePageProps = Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ spoilers?: string | string[] }>;
}>;

export async function generateMetadata(
  props: ArticlePageProps,
): Promise<Metadata> {
  const article = await loadArticle(props);
  return article
    ? { description: article.excerpt, title: article.title }
    : { title: "文章不存在" };
}

export default async function PublishedArticlePage(props: ArticlePageProps) {
  const article = await loadArticle(props);
  if (!article) notFound();

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
          <p className="eyebrow">PUBLISHED ARTICLE · {article.spoilerLevel}</p>
          <h1>{article.title}</h1>
          <p className="lede">正典标记：{article.canonStatus}</p>
        </header>
        <div className="published-body">
          {article.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <footer className="article-actions">
          <Link className="primary-action" href="/search">
            返回索引台
          </Link>
        </footer>
      </article>
    </main>
  );
}

async function loadArticle({ params, searchParams }: ArticlePageProps) {
  const [{ slug }, searchParameters] = await Promise.all([
    params,
    searchParams,
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
    const article = await getRuntimeSearchService().findPublishedBySlug({
      locale: "zh-CN",
      maxSpoilerLevel,
      slug,
    });
    return article?.kind === "article" ? article : null;
  } catch {
    return null;
  }
}

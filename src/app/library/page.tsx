import Link from "next/link";

export const metadata = {
  description: "了解 Hunter Club 资料库如何处理来源、正典差异与剧透边界。",
  title: "资料库导览",
};

const readingRules = [
  {
    marker: "01",
    title: "先看来源，再看结论",
    body: "重要事实会关联漫画话数、动画集数或官方资料定位；没有来源的传闻不会伪装成定论。",
  },
  {
    marker: "02",
    title: "把版本差异摆在台面上",
    body: "漫画、1999动画与2011动画的差异会明确标注，不把改编补充混进漫画正典。",
  },
  {
    marker: "03",
    title: "剧透边界跟着读者走",
    body: "每条资料都将带有剧透级别。当前导览不包含剧情事实，后续内容会按你的偏好折叠。",
  },
];

export default function LibraryPage() {
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
          <Link aria-current="page" href="/library">
            资料库
          </Link>
        </nav>
      </header>

      <article className="library-article">
        <header>
          <p className="eyebrow">PUBLIC ARCHIVE · READING GUIDE</p>
          <h1>资料库不是百科抄写间。</h1>
          <p className="lede">
            它是一套把“作品里发生了什么”“哪个版本这样表达”“证据在哪里”分开记录的阅读方法。
          </p>
        </header>

        <ol className="reading-rules">
          {readingRules.map((rule) => (
            <li key={rule.marker}>
              <span>{rule.marker}</span>
              <div>
                <h2>{rule.title}</h2>
                <p>{rule.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="archive-status">
          <p className="eyebrow">ARCHIVE STATUS</p>
          <h2>第一批结构化资料将在阶段3出版</h2>
          <p>
            当前页面是可直接访问、可索引的正式资料库导览。它不依赖酒吧场景，也不会用占位卡片冒充已核验内容。
          </p>
        </aside>

        <footer className="article-actions">
          <Link
            className="primary-action"
            href="/saloon?spoilers=safe#npc-explorer"
          >
            返回探险者身边
          </Link>
          <Link className="text-link" href="/">
            回到门外
          </Link>
        </footer>
      </article>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <section className="status-card">
        <p className="eyebrow">404 · LOST TRAIL</p>
        <h1>这条路还没有通向酒吧</h1>
        <p className="lede">页面不存在，或者入口还没有在当前阶段开放。</p>
        <Link className="primary-link" href="/">
          返回酒吧门外
        </Link>
      </section>
    </main>
  );
}

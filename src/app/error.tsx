"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <section className="status-card" role="alert">
        <p className="eyebrow">TEMPORARY CLOSURE</p>
        <h1>酒吧暂时无法接待</h1>
        <p className="lede">系统没有公开内部故障细节。可以安全地重新尝试。</p>
        <button className="primary-link" onClick={reset} type="button">
          重新尝试
        </button>
      </section>
    </main>
  );
}

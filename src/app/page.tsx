const foundations = [
  "严格 TypeScript 与模块边界",
  "版本化 PostgreSQL 迁移",
  "请求关联 ID 与稳定错误格式",
  "结构化日志与健康检查",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="status-card" aria-labelledby="page-title">
        <p className="eyebrow">HUNTER CLUB · PHASE 1</p>
        <h1 id="page-title">酒吧还在打烊施工</h1>
        <p className="lede">
          门、吧台与人物会在下一阶段出现。现在先把承重结构、供水和逃生通道做好。
        </p>

        <ul className="foundation-list">
          {foundations.map((foundation) => (
            <li key={foundation}>{foundation}</li>
          ))}
        </ul>

        <nav className="health-links" aria-label="系统状态">
          <a href="/health/live">存活检查</a>
          <a href="/health/ready">就绪检查</a>
        </nav>
      </section>
    </main>
  );
}

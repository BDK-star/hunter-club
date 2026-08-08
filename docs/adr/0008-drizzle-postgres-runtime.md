# ADR-0008：采用Drizzle迁移与Postgres.js运行时驱动

- 状态：Accepted
- 日期：2026-08-02

## 背景

阶段1需要建立可审计的PostgreSQL迁移和适用于Vercel到Supabase连接方式的运行时访问，同时保持领域层不依赖ORM。运行时连接与迁移连接的生命周期、权限和池化要求不同。

## 决策

- 使用Drizzle Kit生成和保存版本化SQL迁移。
- 使用Drizzle ORM作为基础设施层的类型化查询适配器，不允许其类型进入领域层或模块公开接口。
- 使用Postgres.js建立运行时连接，并关闭预处理语句以兼容Supabase事务池模式。
- `DATABASE_URL`用于应用运行时；`DATABASE_MIGRATION_URL`用于迁移、备份和管理任务，两者必须分别配置。
- CI使用PGlite执行快速迁移冒烟测试；涉及约束、事务、并发、索引或扩展的领域迁移仍必须通过原生PostgreSQL集成测试。
- 阶段1基线迁移不创建虚构的业务表；业务表由后续阶段的所属模块引入。

## 后果

正面：

- SQL迁移可以直接审查、回放和导出，不绑定Supabase专属API。
- 运行时适配Vercel的短生命周期连接，迁移仍可使用独立直连或会话连接。
- 领域代码与数据库工具隔离，未来可更换适配器。

代价：

- PGlite不能替代原生PostgreSQL的并发、扩展和连接行为验证。
- 必须避免在Server Components或Route Handlers中随意创建数据库客户端。
- 迁移需要遵守Expand/Migrate/Contract，并保持应用向前和向后短期兼容。

## 参考

- [Drizzle迁移概览](https://orm.drizzle.team/docs/migrations)
- [Supabase PostgreSQL连接方式](https://supabase.com/docs/guides/database/connecting-to-postgres)

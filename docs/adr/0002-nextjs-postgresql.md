# ADR-0002：采用TypeScript、Next.js和PostgreSQL

- 状态：Accepted
- 日期：2026-08-01

## 背景

网站同时需要公开内容的服务端渲染、可交互场景、认证写入、审核后台和开源贡献者友好的统一技术栈。

## 决策

- 全栈语言使用TypeScript并启用严格模式。
- Web框架使用Next.js App Router。
- 页面和布局默认使用Server Components，交互边界才使用Client Components。
- PostgreSQL作为交易数据真相源。
- 服务端页面直接调用应用服务，不通过内部Route Handler产生额外HTTP跳转。
- 对外集成和明确HTTP客户端才使用版本化接口。

## 后果

正面：

- 前后端共享类型语言和工具链。
- 公开内容具备SSR、直达URL和SEO基础。
- 关系、事务、JSONB和搜索起步能力可由一个数据库承担。

代价：

- 必须严格控制Client Component边界和浏览器包体积。
- Next.js升级可能影响缓存和渲染语义，需要版本测试。
- 领域层必须隔离框架与ORM，避免技术栈渗透业务规则。

## 参考

- [Next.js App Router](https://nextjs.org/docs/app)
- [Server与Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [PostgreSQL全文搜索](https://www.postgresql.org/docs/current/functions-textsearch.html)

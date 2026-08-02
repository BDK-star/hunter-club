# ADR-0006：数据库搜索起步并保留替换端口

- 状态：Accepted
- 日期：2026-08-01

## 背景

首版需要搜索中文名称、别名、日文名、罗马字、正文和筛选，但数据量与团队规模不足以证明独立搜索集群的运维成本。

## 决策

- PostgreSQL保存可重建的搜索投影。
- 使用规范化名称、受控别名、前缀匹配和`pg_trgm`相似索引起步。
- 搜索通过`SearchService`端口调用，路由和领域模块不依赖具体查询实现。
- 搜索结果必须应用发布、权限和剧透过滤。
- 记录匿名化查询、零结果和结果点击。
- 只有真实延迟、零结果率或中文检索质量数据证明需要时，才接入独立搜索引擎。

## 后果

正面：

- 首版少一个服务和同步故障点。
- 别名词库与结构化筛选先解决最确定的问题。
- 后续可替换实现而不改变调用者。

代价：

- PostgreSQL原生文本配置不自动解决全部中文分词问题。
- 复杂相关性、拼写容忍和分面需求可能促使升级。
- 搜索投影与真相源之间需要Outbox同步和重建工具。

## 参考

- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Meilisearch全文搜索能力](https://www.meilisearch.com/docs/capabilities/full_text_search/overview)

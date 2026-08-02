# 架构决策记录

ADR记录已经接受、对未来实现有显著约束的技术与产品架构决策。

## 规则

- 状态使用`Proposed`、`Accepted`、`Deprecated`或`Superseded by ADR-xxxx`。
- 已接受ADR不重写结论；改变方向时新增ADR并建立替代关系。
- Pull Request若违反ADR，必须先提交新的决策记录。
- ADR描述“为什么”和后果，不复制具体实现手册。

## 索引

- [ADR-0001：采用模块化单体](0001-modular-monolith.md)
- [ADR-0002：采用TypeScript、Next.js和PostgreSQL](0002-nextjs-postgresql.md)
- [ADR-0003：采用配置驱动的NPC体验引擎](0003-config-driven-npc-engine.md)
- [ADR-0004：采用来源感知的双内容模型](0004-content-and-canon-model.md)
- [ADR-0005：应用用户与认证身份分离](0005-authentication.md)
- [ADR-0006：数据库搜索起步并保留替换端口](0006-search-evolution.md)
- [ADR-0007：试运行采用GitHub、Vercel与Supabase](0007-trial-deployment.md)

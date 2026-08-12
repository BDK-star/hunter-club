# Hunter Club

面向全球中文《HUNTER×HUNTER》爱好者的非官方内容与交流网站。项目以一座美式西部酒吧作为叙事化门户：用户从酒吧门进入，在2.5D场景中与NPC对话，并由NPC进入资料库、念能力测试、投稿、讨论等标准功能页面。

> 当前状态：阶段2已完成并部署；阶段3正在开发身份、资料、出版和搜索基础。已落地版本化数据模型、`aal2`授权策略、Supabase登录适配器、安全内部会话、不可变内容修订、发布计划服务和可重建PostgreSQL搜索投影；供应商控制台验收、原子发布存储、编辑界面与公开检索仍未完成。

## 已确认的产品方向

- 分阶段混合社区：编辑内容为主体，用户可评论、收藏、投稿和纠错。
- 结构化资料库与专题文章并列为一等内容模型。
- 漫画为主线正典，同时明确记录1999动画、2011动画及其他材料差异。
- 首版采用可访问的2.5D酒吧场景；访客可进入，写操作和个人记录才要求登录。
- NPC使用确定性、配置驱动的对话图；业务逻辑不写进NPC。
- 首版为模块化单体：TypeScript、Next.js App Router、PostgreSQL。
- 试运行参考部署：GitHub + Vercel Hobby + Supabase Free。
- 代码采用 Apache-2.0；媒体资产、用户内容与第三方作品另行授权。

## 文档入口

- [项目上下文](CONTEXT.md)
- [决策登记表](docs/decision-register.md)
- [产品边界](docs/product/product-boundary.md)
- [核心用户旅程](docs/product/user-journeys.md)
- [NPC与功能映射](docs/product/npc-capability-map.md)
- [系统总览](docs/architecture/system-overview.md)
- [领域模型](docs/architecture/domain-model.md)
- [模块边界](docs/architecture/module-boundaries.md)
- [数据模型](docs/architecture/data-model.md)
- [安全与权限](docs/architecture/security-and-permissions.md)
- [部署方案](docs/architecture/deployment.md)
- [可观测性与恢复](docs/architecture/observability-and-recovery.md)
- [质量门槛](docs/architecture/quality-gates.md)
- [MVP交付路线](docs/roadmap/mvp-delivery-plan.md)
- [阶段1完成清单](docs/governance/phase-1-checklist.md)
- [阶段2完成清单](docs/governance/phase-2-checklist.md)
- [阶段3完成清单](docs/governance/phase-3-checklist.md)
- [阶段1环境接入手册](docs/runbooks/phase-1-environments.md)
- [阶段3认证配置与验收](docs/runbooks/phase-3-auth.md)

关键架构选择记录在 [`docs/adr`](docs/adr/) 下。实现阶段的Pull Request必须遵守这些边界；若要改变已接受决策，应先新增或替代ADR。

## 本地运行

需要Node.js 24 LTS、pnpm 11和兼容Docker Compose的容器运行时。

1. 将`.env.example`复制为`.env.local`。
2. 执行`docker compose up -d postgres`启动本地PostgreSQL。
3. 执行`pnpm install --frozen-lockfile`安装锁定依赖。
4. 执行`pnpm db:migrate`应用版本化迁移。
5. 执行`pnpm dev`启动网站。

内容发布或回滚后执行`pnpm search:rebuild`可从当前发布指针原子重建公开搜索投影；命令使用`DATABASE_MIGRATION_URL`，只能由受信任维护者或部署任务执行。

可用的运行状态接口为`/health/live`和`/health/ready`。提交前执行`pnpm quality`；它会检查格式、Lint、严格类型、模块边界、测试、迁移和生产构建。

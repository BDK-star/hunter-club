# 决策登记表

本表逐项记录需求访谈中已经接受的31项决策。状态均为`Accepted`。若改变任何一项，必须提交替代ADR或明确的产品决策记录。

| ID | 已接受决策 | 主要落点 |
|---|---|---|
| D01 | 采用分阶段混合社区；编辑内容为主体，首版限制开放UGC。 | `product-boundary.md` |
| D02 | 结构化资料库与专题文章均为一等内容。 | ADR-0004、`domain-model.md` |
| D03 | 漫画为主线正典，关键事实记录来源、正典状态和剧透等级。 | ADR-0004、`data-model.md` |
| D04 | 采用游客、会员、贡献者、编辑、版主、管理员六级角色与审核工作流。 | `security-and-permissions.md` |
| D05 | 按1至3名维护者、首年月活不超过1万落地，采用可扩展到中型社区的模块化单体。 | ADR-0001、`CONTEXT.md` |
| D06 | 技术基线为TypeScript、Next.js App Router和PostgreSQL。 | ADR-0002 |
| D07 | 面向全球中文用户，简体中文为首版默认语言，预留翻译结构。 | `CONTEXT.md`、`data-model.md` |
| D08 | 使用标准Node/Docker、PostgreSQL和S3端口保持平台可迁移。 | `system-overview.md`、`deployment.md` |
| D09 | 应用User与外部Identity分离；不自建密码；高权限角色强制二次认证。 | ADR-0005 |
| D10 | 默认只存储原创、用户自有或明确授权媒体，建立权利元数据与下架流程。 | `product-boundary.md`、`ASSET_LICENSES.md` |
| D11 | 首版只做与内容绑定的异步讨论，不做聊天室、私信和独立论坛。 | `product-boundary.md`、`domain-model.md` |
| D12 | 使用固定分类和受控标签词库；用户提交标签建议，由编辑审核。 | `domain-model.md`、`data-model.md` |
| D13 | PostgreSQL搜索起步，通过统一端口保留独立搜索引擎升级路径。 | ADR-0006 |
| D14 | 首页采用内容门户目标，但表现为西部酒吧NPC叙事空间，而非算法信息流。 | `product-boundary.md`、ADR-0003 |
| D15 | 酒吧门是叙事化入口；访客可进入，写操作和个人记录才要求登录。 | `user-journeys.md` |
| D16 | 酒吧采用响应式2.5D分层插画，不做全3D自由场景。 | ADR-0003 |
| D17 | 首版NPC对话完全确定性；未来仅预留受约束AI适配器。 | ADR-0003、`npc-capability-map.md` |
| D18 | 念能力测试采用版本化、可解释计分问卷，不使用AI自由判断。 | `domain-model.md`、`data-model.md` |
| D19 | 首版只发布门外和大厅，但底层采用多场景模型。 | ADR-0003 |
| D20 | 场景、对话与关键配置进入Git；运营内容和用户数据进入数据库，并提供导入导出。 | `data-model.md`、`npc-capability-map.md` |
| D21 | 非商业试运行采用GitHub源码、Vercel Hobby应用、Supabase Free数据库/认证/存储。 | ADR-0007、`deployment.md` |
| D22 | 程序代码使用Apache-2.0；媒体、社区内容和第三方作品分别授权。 | `LICENSE`、`NOTICE`、`ASSET_LICENSES.md` |
| D23 | 保护`main`，所有变更经Pull Request、自动检查和代码所有者审核。 | `CONTRIBUTING.md`、`quality-gates.md` |
| D24 | 分层测试、视觉回归、无障碍和部署后冒烟检查构成发布门槛。 | `quality-gates.md` |
| D25 | 性能优先于装饰效果，采用渐进加载、资源预算和自动降级。 | `quality-gates.md` |
| D26 | 从首版实施数据最小化、分类保留、导出和账号删除。 | `data-model.md`、`security-and-permissions.md` |
| D27 | 使用结构化举报案件、分级处罚、人工最终决定和申诉。 | `domain-model.md` |
| D28 | 试运行目标为99.5%可用性、RPO 24小时、RTO 4小时。 | `observability-and-recovery.md` |
| D29 | 站内通知为主，必要事务邮件通过Outbox异步处理。 | `system-overview.md` |
| D30 | MVP完成可运营纵向闭环，明确延期论坛、私信、AI、全3D和复杂推荐。 | `mvp-delivery-plan.md` |
| D31 | 先建立版本化架构文档和ADR，评审后再开始代码实现。 | 当前文档集 |

## 解释优先级

发生冲突时按以下顺序处理：

1. 最新已接受且明确替代旧决策的ADR。
2. `CONTEXT.md`中的不可违反边界。
3. 本决策登记表。
4. 架构与产品细化文档。
5. 实现代码和注释。

代码与已接受决策冲突时，应修正代码或先改变决策，不能以“已经实现”为理由反向篡改架构历史。

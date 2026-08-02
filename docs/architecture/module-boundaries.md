# 模块边界与依赖规则

## 推荐目录形态

```text
src/
├─ app/                  # Next.js路由和组合根
├─ modules/
│  ├─ experience/
│  ├─ identity/
│  ├─ catalog/
│  ├─ publishing/
│  ├─ taxonomy/
│  ├─ search/
│  ├─ community/
│  ├─ contribution/
│  ├─ assessment/
│  ├─ moderation/
│  ├─ notification/
│  └─ media-rights/
├─ platform/             # 数据库、邮件、存储、监控等适配器
├─ shared-kernel/        # 少量稳定值对象与基础结果类型
└─ test-support/
```

每个模块内部建议使用：

```text
module/
├─ domain/               # 实体、值对象、领域规则、事件
├─ application/          # 用例、命令、查询、端口
├─ infrastructure/       # 仓储和外部服务适配器
├─ presentation/         # 模块UI与请求适配
└─ public.ts             # 其他模块唯一允许导入的入口
```

## 模块职责

| 模块 | 拥有 | 不拥有 |
|---|---|---|
| Experience | 场景清单、NPC、对话状态、能力映射 | 资料、测试计分、权限规则 |
| Identity | 用户、外部身份、会话、角色绑定 | 社区处罚、内容审核状态 |
| Catalog | 资料实体、事实、来源、实体关系、翻译 | 长文章工作流、评论 |
| Publishing | 文章、通用修订、发布与归档 | 用户认证、搜索实现 |
| Taxonomy | 分类、规范标签、别名、合并与停用 | 全文索引 |
| Search | 搜索文档、查询与结果排序端口 | 内容真相源 |
| Community | 讨论主题、评论、收藏 | 举报裁决、邮件发送 |
| Contribution | 投稿、纠错、审核队列协调 | 实际文章或资料所有权 |
| Assessment | 测试定义、尝试、计分和结果 | NPC台词、用户身份凭据 |
| Moderation | 举报案件、处罚、申诉、证据引用 | 评论正文或文章正文的真相源 |
| Notification | 站内通知、偏好、发送状态 | 业务决定 |
| Media Rights | 媒体元数据、权利依据、隔离状态 | 文章结构、对象存储供应商实现 |

## 允许的协作方式

- 同进程应用服务调用对方`public.ts`暴露的端口。
- 使用稳定ID引用另一个聚合，不共享可变对象。
- 通过领域事件触发最终一致的通知、搜索和分析。
- 组合查询由专用读取模型完成，但不得借此实施写规则。

## 禁止的依赖

- 从一个模块直接导入另一个模块的ORM模型或内部仓储。
- 在React组件中直接执行跨模块数据库查询。
- 由Experience模块判断用户是否有编辑或管理权限。
- 由Notification模块决定投稿是否批准。
- 由Search索引作为内容真相源。
- 通过共享`utils`目录隐藏业务耦合。
- 用数据库触发器跨模块实现不可见业务流程；完整性约束除外。

## 共享内核限制

`shared-kernel`只允许放置：

- 稳定标识类型。
- 时间、分页和通用结果类型。
- Locale、SpoilerLevel等跨域值对象。
- 不包含业务判断的基础错误类别。

任何包含“用户能否”“内容是否应”“案件如何”等语义的逻辑必须回到所属模块。

## 架构自动检查

实现阶段应使用静态规则验证：

- 领域层不得依赖Next.js、React、Supabase或具体ORM。
- 模块间只能导入`public.ts`。
- `app`和`presentation`可依赖应用层，不能直接依赖仓储实现。
- `platform`实现端口，但业务模块不能反向依赖具体适配器。

违反规则必须让CI失败，而不是依赖代码审查者记忆。

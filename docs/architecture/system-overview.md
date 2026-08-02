# 系统架构总览

## 架构风格

系统采用模块化单体。用户界面、应用服务和领域模块随同一个Next.js应用部署，但模块通过显式端口协作，各自拥有数据和规则。只有在真实容量、团队或故障隔离需求出现后，才允许将模块拆成独立服务。

## 系统上下文

```mermaid
flowchart LR
    Visitor["访客"] --> Web["Hunter Club Web"]
    Member["会员与贡献者"] --> Web
    Staff["编辑、版主、管理员"] --> Web
    Developer["GitHub开发者"] --> Repo["GitHub仓库"]
    Repo --> CI["检查、预览与发布"]
    CI --> Web
    Web --> IdP["身份认证提供方"]
    Web --> Mail["事务邮件服务"]
    Web --> Object["S3兼容对象存储"]
    Web --> Monitor["错误与可用性监控"]
    Web --> Source["外部资料来源"]
```

## 运行容器

```mermaid
flowchart TB
    Browser["浏览器\n2.5D体验 + 标准页面"]

    subgraph App["Next.js模块化单体"]
      Routes["页面、Route Handlers、Server Actions"]
      Experience["场景与NPC体验层"]
      Application["应用服务与能力注册表"]
      Domains["领域模块"]
      Jobs["任务执行器"]
      Adapters["数据库、认证、存储、邮件、搜索适配器"]
    end

    DB[("PostgreSQL")]
    Storage[("对象存储")]
    Auth["OIDC/认证服务"]
    Email["邮件服务"]
    Obs["日志、错误与指标"]

    Browser --> Routes
    Routes --> Experience
    Routes --> Application
    Experience --> Application
    Application --> Domains
    Jobs --> Domains
    Domains --> Adapters
    Adapters --> DB
    Adapters --> Storage
    Adapters --> Auth
    Adapters --> Email
    Adapters --> Obs
```

## 请求处理原则

### 读取

1. 路由解析用户、语言和剧透上下文。
2. 页面调用所属模块的查询服务。
3. 查询服务应用发布状态、权限和剧透过滤。
4. Server Component直接从应用服务读取，不通过内部HTTP绕行。
5. 返回可缓存的视图模型；浏览器不接收内部实体或敏感字段。

### 写入

1. 表单或Route Handler解析请求。
2. 统一模式校验拒绝格式错误输入。
3. 服务端加载身份并执行授权。
4. 应用服务开启事务并调用领域规则。
5. 业务数据与Outbox事件在同一事务提交。
6. 任务执行器异步处理通知、索引和衍生资源。
7. 返回稳定结果或标准化错误，不暴露底层异常。

## 渲染与缓存

- 公开资料和文章优先服务端渲染，保证直接访问、分享和搜索收录。
- 用户状态、通知和审核页面动态渲染，禁止公共缓存。
- 发布内容以内容版本或缓存标签失效，不以任意短TTL掩盖一致性问题。
- 授权结果、剧透过滤结果和草稿不得进入共享缓存。
- 体验层只在需要动画、浏览器API或本地状态的区域使用Client Component。

## 异步一致性

通知、搜索索引、媒体衍生和分析使用Outbox：

```mermaid
sequenceDiagram
    participant U as 用户请求
    participant A as 应用服务
    participant D as PostgreSQL
    participant W as 任务执行器
    participant E as 外部服务
    U->>A: 提交评论或审核决定
    A->>D: 同一事务写业务数据与Outbox
    D-->>A: 提交成功
    A-->>U: 返回稳定结果
    W->>D: 领取待处理事件
    W->>E: 幂等执行邮件/索引任务
    W->>D: 标记成功或安排重试
```

Outbox不用于需要即时强一致的权限和内容发布决定；这些必须在原事务内完成。

## 可迁移性合同

核心业务只能依赖：

- PostgreSQL标准能力和经记录的扩展。
- S3兼容对象存储端口。
- OIDC或认证端口。
- 搜索端口。
- 邮件端口。
- 日志、指标和追踪端口。

Vercel和Supabase是试运行适配器，不得出现在领域模块类型、状态机或业务规则中。

# 阶段2完成清单

阶段2交付酒吧入口纵向切片。所有交互必须保留标准URL和可访问的DOM入口；Scene Manifest只描述场景、热点、NPC与白名单动作，不承载业务逻辑。

## 第一项：依赖安全技术债

- [x] 将阶段1合并后Dependabot报告的4个受影响依赖族登记为阶段2首项技术债。
- [x] 将Next.js升级到包含PostCSS 8.5.23和Sharp 0.35.3的版本，关闭`postcss`与`sharp`告警。
- [x] 将`nanoid`锁定到3.3.17或更高的兼容版本，关闭无限循环告警。
- [x] 更新顶层`tsx`，并对`drizzle-kit`遗留loader使用窄范围`esbuild`覆盖，关闭两条`esbuild`告警。
- [x] 使用官方npm审计源确认高、中、低、严重漏洞均为0。
- [x] 验证Drizzle CLI、单元测试、集成测试、严格类型、架构边界和生产构建。
- [x] 合并后确认GitHub Dependabot的8条关联告警全部关闭。

2026-08-08基线：Dependabot共有8条开放告警，按升级单元归为`nanoid`、`postcss`、`sharp`和`esbuild`4个依赖族；严重度为4条高、3条中、1条低、0条严重。生产依赖风险优先于场景功能开发。

本地修复证据：Next.js与ESLint配置升级到16.3.0，`tsx`升级到4.23.9；锁文件解析为PostCSS 8.5.23/8.5.25、Sharp 0.35.3、Nano ID 3.3.17以及esbuild 0.25.4/0.28.1。官方npm审计源报告0条漏洞；Drizzle Kit 0.31.10可启动，6个单元测试文件的10项测试、1项集成测试和生产构建通过。`pnpm-workspace.yaml`仅允许esbuild与Sharp执行安装脚本；当Drizzle Kit移除已废弃的`@esbuild-kit` loader后，应删除对应的窄范围覆盖。

远端闭环证据：2026-08-10，[Pull Request #3](https://github.com/BDK-star/hunter-club/pull/3)以Squash方式合并为`a1eccb69e246c4ed93d86164fed1e7fe41b4304e`；主干[Quality](https://github.com/BDK-star/hunter-club/actions/runs/31377828337)与[Governance](https://github.com/BDK-star/hunter-club/actions/runs/31377828209)成功，Vercel生产部署完成，Dependabot开放告警查询结果为空。

## 酒吧入口纵向切片

- [x] 门外与大厅使用原创低保真占位视觉，资源许可登记完整。
- [x] Scene Manifest、NPC、热点、对话图和能力注册表具有运行时校验与版本字段。
- [x] 访客可以从门外进入大厅，设置或跳过剧透偏好，并通过NPC进入一个真实内容页面。
- [x] 场景动作只映射白名单能力；直接URL与标准导航不依赖场景状态。
- [ ] 键盘、触摸、屏幕阅读器和减少动画模式可完成同一核心旅程。
- [x] 场景资源或JavaScript失败时展示可导航的静态降级界面。
- [ ] 视觉回归、响应式断点和性能预算进入自动检查。

## 阶段退出条件

- [x] 访客无需登录即可从酒吧入口进入一个真实内容页面。
- [x] 资源失败时核心导航仍可使用。
- [ ] 本地质量门、Pull Request门禁、Vercel Preview和生产冒烟全部通过。

阶段2只有在全部退出条件关闭后才能结束。阶段2不得提前实现身份、出版、念能力测试计分或社区写入闭环。

## 当前实现证据

- 2026-08-10首个纵向切片实现`/`、`/saloon`与`/library`；生产态HTTP冒烟确认三个路由均返回200，入口、大厅、资料库与返回链接互通。
- Experience模块包含2个版本化Scene Manifest、4个NPC、5个热点、4张确定性对话图和3个白名单导航动作。配置校验覆盖未知动作、缺失引用、不可达节点与无法结束的对话。
- 门外使用原生`details`与GET表单选择剧透等级；大厅始终渲染标准导航和文字版功能入口。JavaScript不可用时仅NPC多步对话降级，核心路由保持可达。
- 门外与大厅关键场景完全由HTML/CSS绘制，不加载第三方场景媒体。自动体验合同限制全局CSS为64 KiB、社交预览图为2.5 MiB，并验证移动断点、减少动画规则和资产哈希登记。

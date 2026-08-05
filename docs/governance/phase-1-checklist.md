# 阶段1完成清单

## 可运行工程

- [x] Next.js App Router、React和严格TypeScript骨架存在。
- [x] 基础页面、全局样式变量、404和安全错误页可构建。
- [x] Node.js与pnpm版本已固定，依赖锁文件存在。

## 平台合同

- [x] 环境变量启动校验区分运行时数据库与迁移数据库连接。
- [x] 请求关联ID会透传安全值并替换危险值。
- [x] 错误响应使用稳定代码、公开消息和请求ID，不暴露内部原因。
- [x] 结构化日志包含模块、操作和请求ID，并脱敏已知秘密字段。
- [x] `/health/live`不访问外部依赖；`/health/ready`验证数据库并安全降级。

## 数据库

- [x] Drizzle版本化基线迁移存在，并在隔离PostgreSQL引擎中应用成功。
- [x] `compose.yaml`提供本地原生PostgreSQL服务定义。
- [ ] 在原生PostgreSQL 18上执行迁移和就绪检查。本机当前未安装Docker兼容运行时。
- [x] Supabase开发项目`hunter-club-dev`已创建，状态健康，区域为新加坡。
- [x] Vercel Preview环境已分别配置Supabase运行时池连接和独立迁移连接；变量值未进入仓库或核验记录。

## 架构与质量

- [x] 12个业务模块入口已建立，不提前发明业务接口。
- [x] 自动依赖检查禁止循环、领域层技术依赖、跨模块内部导入和表现层直连仓储。
- [x] 单元测试、迁移测试、Lint、严格类型检查和生产构建通过。
- [x] GitHub Actions质量流水线定义存在，第三方Action固定到提交SHA。
- [x] 远端Pull Request上的`Governance`、`DCO`和`Quality`检查全部通过。

## 部署

- [x] Vercel项目`hunter-club`已连接GitHub仓库，生产域名已生成且现有部署状态为`Ready`。
- [x] Draft PR分支已成功生成隔离预览。
- [x] 数据库连接变量仅配置在Preview环境，指向Supabase开发项目；阶段1没有生产数据。
- [x] 预览环境的主页、`/health/live`和`/health/ready`冒烟通过。

阶段1只有在所有未完成项关闭后才能退出。本地骨架完成不等于云端环境已经就绪。

## 当前证据

- 功能提交：`2c586a9061736d6f80364613c994ee3c23bbce99`
- Draft Pull Request：<https://github.com/BDK-star/hunter-club/pull/2>
- Governance与DCO：<https://github.com/BDK-star/hunter-club/actions/runs/30736300968>
- Quality：<https://github.com/BDK-star/hunter-club/actions/runs/30736300981>
- 本地冒烟：主页与`/health/live`返回200；没有数据库服务时`/health/ready`返回稳定503。
- Supabase开发项目：`hunter-club-dev`（项目引用`yaatxtombsxziktvphvk`），2026-08-02控制台显示状态`Healthy`、区域`ap-southeast-1`；未把数据库密码或连接串写入仓库。
- Vercel项目：`hunter-club`已连接`BDK-star/hunter-club`；2026-08-02控制台显示阶段0生产部署`Ready`，域名为<https://hunter-club-flame.vercel.app>。
- Vercel环境变量：`DATABASE_URL`、`DATABASE_MIGRATION_URL`、`APP_ENV`和`LOG_LEVEL`仅为Preview作用域；只核验名称和作用域，未读取变量值。
- Vercel Preview：提交`c91fb86094a27b30c663040b3be303355a00d0de`部署成功，地址为<https://hunter-club-git-feat-phase-1-runnable-aba586-bdk-stars-projects.vercel.app>。
- 2026-08-05认证浏览器冒烟：首页标题为`Hunter Club`并显示阶段1施工页；`/health/live`返回`status: ok`、`process: up`和请求ID；`/health/ready`返回`status: ok`、`database: up`和请求ID。

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
- [ ] Supabase开发项目已配置运行时池连接和独立迁移连接。

## 架构与质量

- [x] 12个业务模块入口已建立，不提前发明业务接口。
- [x] 自动依赖检查禁止循环、领域层技术依赖、跨模块内部导入和表现层直连仓储。
- [x] 单元测试、迁移测试、Lint、严格类型检查和生产构建通过。
- [x] GitHub Actions质量流水线定义存在，第三方Action固定到提交SHA。
- [x] 远端Pull Request上的`Governance`、`DCO`和`Quality`检查全部通过。

## 部署

- [ ] Vercel项目已连接GitHub仓库并成功生成隔离预览。
- [ ] 预览环境只使用开发数据库和合成数据，不包含生产秘密。
- [ ] 预览环境的主页、`/health/live`和`/health/ready`冒烟通过。

阶段1只有在所有未完成项关闭后才能退出。本地骨架完成不等于云端环境已经就绪。

## 当前证据

- 功能提交：`2c586a9061736d6f80364613c994ee3c23bbce99`
- Draft Pull Request：<https://github.com/BDK-star/hunter-club/pull/2>
- Governance与DCO：<https://github.com/BDK-star/hunter-club/actions/runs/30736300968>
- Quality：<https://github.com/BDK-star/hunter-club/actions/runs/30736300981>
- 本地冒烟：主页与`/health/live`返回200；没有数据库服务时`/health/ready`返回稳定503。
- Supabase开发项目：`hunter-club-dev`（项目引用`yaatxtombsxziktvphvk`），2026-08-02控制台显示状态`Healthy`、区域`ap-southeast-1`；未把数据库密码或连接串写入仓库。
- Vercel账号已登录但尚无项目；控制台导入页连续超时，未创建重复项目，也未把未完成部署记为成功。

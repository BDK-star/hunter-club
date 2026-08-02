# ADR-0007：试运行采用GitHub、Vercel与Supabase

- 状态：Accepted
- 日期：2026-08-01

## 背景

项目希望源码放在GitHub，先使用免费域名和数据库试运行。GitHub Pages只能静态托管，无法支持既定的动态Next.js能力。

## 决策

- GitHub保存源码、Issue、Pull Request和自动检查。
- Vercel Hobby运行非商业试用的Next.js应用，并提供`.vercel.app`地址。
- Supabase Free提供试运行PostgreSQL、认证和授权媒体存储。
- 运行时使用标准PostgreSQL连接和适配端口，保持迁移能力。
- 使用开发与生产隔离项目；预览部署不得访问生产数据。
- 独立备份不依赖Supabase单一账户。

## 后果

正面：

- 无需维护服务器和数据库进程即可验证产品。
- Git提交自动产生预览和生产部署。
- 免费额度足以支持低流量试运行。

代价：

- 免费服务可能暂停、限额且没有企业SLA。
- Vercel Hobby只允许个人、非商业用途。
- Supabase集成功能必须封装，避免专有API扩散。
- 商业化或团队扩大时必须重新评估成本和条款。

## 迁移触发条件

- 商业用途出现。
- 免费额度或暂停影响SLO。
- 需要团队级部署权限或更长日志保留。
- 数据驻留、备份、网络延迟或合规要求变化。

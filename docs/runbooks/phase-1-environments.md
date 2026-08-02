# 阶段1环境接入手册

## Supabase开发项目

1. 在Supabase创建独立的开发项目，不使用未来生产项目的数据或密码。
2. 从项目的Connect界面取得两类连接：
   - `DATABASE_URL`：Vercel运行时使用事务池连接，端口通常为`6543`。
   - `DATABASE_MIGRATION_URL`：迁移优先使用直连；网络不支持IPv6时使用会话池连接。
3. 运行时驱动已设置`prepare: false`，以兼容事务池不支持预处理语句的限制。
4. 在本地先执行`pnpm config:check`，再执行`pnpm db:migrate`。
5. `/health/ready`返回200后，保存项目引用和迁移版本；不得记录连接串或密码。

## Vercel预览项目

1. 从Vercel导入`BDK-star/hunter-club`，框架应识别为Next.js。
2. 将Node.js版本设置为24，并保留`pnpm build`构建命令。
3. Preview环境设置：
   - `APP_ENV=preview`
   - `APP_BASE_URL`使用预览域名；若平台无法为每次预览注入完整URL，由应用在后续阶段从可信请求来源解析。
   - `LOG_LEVEL=info`
   - 两个数据库变量只指向Supabase开发项目。
4. Production环境暂不配置真实用户数据；阶段1只验证空骨架。
5. 确认预览部署无法读取未来生产环境的认证、邮件、存储或数据库秘密。

## 冒烟与证据

每次首次接入或更换数据库连接后记录：

- Git提交SHA和Vercel部署URL。
- `/`与`/health/live`为200。
- `/health/ready`为200；断开开发数据库时返回稳定503且没有内部连接信息。
- 响应含`x-request-id`，应用日志能用同一ID定位请求。
- Supabase迁移日志显示当前基线已应用。

证据只保存URL、状态、时间和不敏感ID；不得把环境变量值复制到Issue、PR、日志或截图。

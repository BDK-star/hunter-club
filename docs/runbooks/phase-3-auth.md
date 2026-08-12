# 阶段3认证配置与验收

本项目使用Supabase Auth作为试运行认证适配器，业务授权仍由Hunter Club内部`users`、`identities`、`sessions`、`roles`和`permissions`负责。公开阅读不得依赖认证供应商可用性。

## 1. 配置应用变量

在Supabase项目控制台的连接/API信息中取得：

- `NEXT_PUBLIC_SUPABASE_URL`：项目URL，例如`https://<project-ref>.supabase.co`。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：当前Publishable key；旧项目若尚未迁移，可暂用兼容的anon key，但不得使用`service_role`。

两项必须成对配置：

- 本地仅写入`.env.local`。
- Vercel分别写入Preview和Production环境；Preview只能连接开发Supabase项目。
- 不把任何真实值、访问令牌、GitHub Client Secret或数据库密码提交GitHub。

变量缺失时`/auth`显示不可用状态，但`/`、`/saloon`、`/library`和健康检查继续工作。

## 2. 配置邮箱验证码

1. 在Supabase Dashboard进入`Authentication > Sign In / Providers > Email`并启用Email。
2. 在`Authentication > Email Templates`将登录模板配置为显示`{{ .Token }}`六位验证码；若仍使用默认Magic Link，页面的验证码输入流程不会完成。
3. 在`Authentication > URL Configuration`设置：
   - Site URL：当前环境的`APP_BASE_URL`。
   - Redirect allow list：本地`http://localhost:3000/auth/callback`、Vercel Preview需要的受控通配地址和生产`https://hunter-club-flame.vercel.app/auth/callback`。
4. 试运行向非项目团队邮箱发信前配置Custom SMTP。Supabase内置SMTP只用于探索，并限制收件人和发送额度。
5. 浏览器验收：发送验证码、输入错误验证码、输入正确验证码、刷新页面、注销当前设备。

## 3. 配置GitHub登录

1. 在Supabase `Authentication > Sign In / Providers > GitHub`复制Supabase回调地址：`https://<project-ref>.supabase.co/auth/v1/callback`。
2. 在GitHub Developer Settings创建OAuth App：
   - Homepage URL使用站点URL。
   - Authorization callback URL使用上一步的Supabase回调地址，不是Hunter Club的`/auth/callback`。
   - 不启用Device Flow。
3. 将GitHub Client ID和Client Secret只写入Supabase的GitHub Provider配置并启用。
4. 确认Hunter Club的`/auth/callback`已进入Supabase Redirect allow list。Supabase完成GitHub交换后，应用在该路由执行PKCE code exchange。
5. 浏览器验收：首次登录、重复登录、拒绝授权、回调缺少code、注销后刷新。

## 4. 服务端安全验收

- Proxy每个请求创建新的Supabase客户端并使用`getClaims()`验签；服务端授权不得信任未验证的`getSession()`用户对象。
- 成功登录把外部`provider + providerSubject`事务化映射为内部用户；首次用户只授予`member`。
- `hc_session`只保存256位随机令牌，使用`HttpOnly`、`SameSite=Lax`、生产`Secure`和明确到期时间；数据库只保存SHA-256摘要。
- 注销同时撤销数据库会话、删除内部Cookie并注销本地Supabase会话。
- 编辑、版主、管理员操作必须从内部会话重新读取角色、账号状态和AAL，并要求`aal2`。
- 普通登录后访问`/auth/mfa`设置TOTP；扫描二维码并验证六位代码后，应用撤销旧内部会话，再从Supabase的`aal2`声明签发新会话。TOTP密钥和验证码不得写入应用数据库或日志。
- 至少保留两个可恢复的管理员身份；遗失验证器时由Supabase Dashboard的用户MFA管理流程人工解除因子，再要求用户重新注册。当前不自行生成伪恢复码。
- 日志和错误页不得输出邮箱、验证码、Cookie、访问令牌或身份供应商响应正文。

## 5. 编辑账号开通

新用户首次登录固定只有`member`，不能从浏览器自行提权。维护者在确认账号与TOTP已经绑定后，使用数据库管理连接执行：

```sql
insert into user_roles (user_id, role_key, granted_by_user_id)
values ('<内部 users.id>', 'editor', '<现有管理员 users.id>')
on conflict (user_id, role_key) do nothing;
```

首位管理员的引导属于部署所有者操作：先在Supabase完成登录与TOTP绑定，再通过Supabase SQL Editor仅授予已核对的内部`users.id`。不得根据邮箱模糊匹配，不得把提权SQL做成公开端点。完成后访问`/editorial`，确认`aal1`被拒绝、`aal2`可见差异和操作按钮。

完成迁移和编辑账号开通后，把该内部ID临时写入本机`.env.local`的`PHASE3_EDITOR_USER_ID`，执行`pnpm seed:phase3`。命令幂等建立一项带集英社官方书目来源的低剧透角色草稿，不会自动审核或发布；随后必须通过`/editorial`人工审阅差异、记录审核理由并发布。完成后可从本机删除该临时变量。

## 6. 当前限制

- TOTP注册、挑战和会话升级已实现；恢复码不由应用伪造，高权限账号恢复仍依赖Supabase控制台和双管理员运维流程。
- 登录和验证码的分布式限流尚未接入；公开开放注册前必须补齐。
- Supabase故障时只关闭登录和写入，不得把酒吧门变成公开内容的强制登录墙。

## 官方参考

- [Supabase Next.js SSR客户端](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase邮箱Magic Link与OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase GitHub登录](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Supabase多因素认证](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase自定义SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

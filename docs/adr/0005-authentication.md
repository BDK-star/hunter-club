# ADR-0005：应用用户与认证身份分离

- 状态：Accepted
- 日期：2026-08-01

## 背景

项目需要邮箱验证码、GitHub登录和未来其他OIDC提供方，同时保持用户投稿、评论和权限不依赖单一认证供应商。

## 决策

- 网站拥有稳定`User`实体。
- 外部凭据存为可绑定的`Identity`。
- 首版不自行处理密码，使用邮箱一次性验证码和GitHub登录。
- 使用服务端会话与安全Cookie。
- 编辑、版主和管理员强制二次认证。
- 认证供应商通过端口适配，业务表只引用内部用户ID。

## 后果

正面：

- 用户可绑定和替换登录方式。
- 认证供应商迁移不会改变业务外键。
- 项目避免承担密码哈希、找回和撞库的全部责任。

代价：

- 需要安全处理身份绑定、冲突和账户恢复。
- 邮件或身份提供方故障会影响登录。
- 高权限账号必须实现二次认证生命周期和恢复流程。

## 参考

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

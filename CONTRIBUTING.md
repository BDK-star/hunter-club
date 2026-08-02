# 贡献指南

## 当前阶段

项目目前只有已确认的架构基线，尚未进入代码实现。贡献前请依次阅读：

1. [`CONTEXT.md`](CONTEXT.md)
2. [`docs/product/product-boundary.md`](docs/product/product-boundary.md)
3. [`docs/architecture/module-boundaries.md`](docs/architecture/module-boundaries.md)
4. 与变更有关的[`docs/adr`](docs/adr/README.md)
5. [`docs/architecture/quality-gates.md`](docs/architecture/quality-gates.md)

## 变更流程

- 一个Pull Request解决一个清晰问题。
- 从短生命周期分支开发，不直接推送`main`。
- 使用`git commit -s`创建每个提交，以添加与提交作者邮箱匹配的DCO签署行。
- 架构变化先提交ADR，再提交实现。
- 数据库变化必须包含迁移、兼容说明和从上一版本升级的测试。
- 新场景或NPC必须说明用户任务、直接URL、移动端、无障碍降级和资源预算。
- 新媒体必须更新资产权利清单，不得提交未经授权的作品素材。
- 提交前运行仓库当时提供的全部检查；项目脚手架建立后，本文件会补充准确命令。

## 提交内容的权利

项目计划采用Apache-2.0许可代码。提交贡献即表示你有权按仓库许可证提供该贡献，并按项目启用的Developer Certificate of Origin流程签署提交。

不要提交：

- 漫画扫描、动画正片、字幕、官方音乐或未授权图片。
- 真实用户数据、生产数据库导出或日志。
- API密钥、Cookie、令牌、邮箱验证码或连接串。
- 来源不明的生成素材或许可证不兼容的代码。

## 评审标准

评审者将检查：

- 是否符合产品边界与ADR。
- 是否保持模块数据所有权和依赖方向。
- 服务端权限与拒绝路径是否经过测试。
- 是否引入隐私、版权、剧透或审核风险。
- 移动端、键盘、减少动画和静态降级是否可用。
- 性能预算、迁移和回退是否可验证。

## 行为要求

技术讨论应针对事实、设计和证据。骚扰、人身攻击、泄露私人信息、恶意剧透、歧视性内容和反复破坏性行为将被限制参与。

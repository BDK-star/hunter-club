# GitHub仓库设置基线

## 目标仓库

- 所有者：`BDK-star`
- 名称：`hunter-club`
- 可见性：Public
- 默认分支：`main`
- 合并方式：只启用Squash Merge。

## main规则

必须启用：

- 所有变更通过Pull Request。
- 必须通过`Governance`和`DCO`检查。
- 合并前解决所有审查对话。
- 只允许线性历史。
- 禁止强制推送。
- 禁止删除`main`。

### 单维护者启动例外

GitHub不允许Pull Request作者批准自己的变更。当前只有`BDK-star`一名维护者，因此初始规则要求Pull Request和状态检查，但审核人数暂设为0。

第二名可信维护者加入后，必须立即：

1. 更新`CODEOWNERS`分配高风险区域。
2. 将必需批准数改为1。
3. 启用必需代码所有者审查。
4. 验证仓库所有者自己的Pull Request也无法绕过审批。

这个例外不允许直接推送`main`或跳过状态检查。

## 安全设置

- 启用依赖图与Dependabot安全更新。
- 公共仓库启用Secret Scanning和Push Protection。
- 启用Private Vulnerability Reporting。
- GitHub Actions默认令牌只读；工作流按需声明最小权限。
- Fork Pull Request不得获得生产部署密钥。

## 标签基线

- 类型：`type: bug`、`type: feature`、`type: architecture`、`type: dependencies`、`type: docs`。
- 状态：`status: needs-triage`、`status: needs-decision`、`status: needs-review`、`status: blocked`。
- 风险：`risk: security`、`risk: data-migration`、`risk: copyright`、`risk: performance`。

## 验证

阶段0结束前保存以下证据：

- 仓库URL和默认分支。
- 活跃规则集JSON。
- 安全设置API结果。
- 首次GitHub Actions成功运行。
- 远程`main`与本地提交SHA一致。

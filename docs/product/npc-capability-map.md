# NPC与功能能力映射

## 设计原则

NPC是体验层的“功能主持人”，不是业务模块。删除NPC、替换美术或增加新场景，不能要求迁移资料、测试或用户数据。

## 首版建议映射

| NPC | 叙事职责 | 首版能力动作 | 依赖模块 |
|---|---|---|---|
| 酒保 | 引导念能力知识与测试 | `OPEN_NEN_GUIDE`、`START_NEN_TEST`、`OPEN_TEST_HISTORY` | Catalog、Assessment、Identity |
| 探险者 | 引导资料发现 | `OPEN_LIBRARY`、`OPEN_SEARCH`、`OPEN_FEATURED_EXPEDITION` | Catalog、Search、Publishing |
| 老板 | 解释酒吧规则并接收贡献 | `OPEN_ABOUT`、`OPEN_RULES`、`START_SUBMISSION`、`SUBMIT_CORRECTION` | Publishing、Contribution |
| 赏金猎人 | 引导社区动态和治理 | `OPEN_DISCUSSIONS`、`OPEN_REPORT_STATUS`、`OPEN_COMMUNITY_TASKS` | Community、Moderation |

具体人物名称、人设、视觉和台词在产品视觉设计阶段细化。上表只冻结功能职责。

## 对话配置合同

每个对话节点至少包含：

```ts
type DialogueNode = {
  id: string;
  actorId: string;
  textKey: string;
  choices: Array<{
    id: string;
    labelKey: string;
    visibleWhen?: Condition[];
    nextNodeId?: string;
    action?: CapabilityAction;
  }>;
};
```

配置约束：

- `textKey`引用本地化文案，不直接把多语言文本复制进节点。
- `visibleWhen`只能读取白名单体验状态，如登录状态、剧透等级或是否完成测试。
- `action`只能引用能力注册表中的已知动作。
- 对话配置不能包含SQL、URL拼接、任意脚本或供应商凭据。
- 所有节点必须通过可达性、死循环和缺失目标校验。

## 能力动作合同

能力动作分为：

- 导航动作：打开稳定站内路由。
- 会话动作：打开登录、设置剧透级别、切换静音。
- 业务动作：开始测试或创建投稿草稿，必须调用应用服务并在服务端授权。
- 体验动作：聚焦NPC、播放已授权音效、切换场景。

能力注册表应是类型安全的显式映射；未知动作导致构建失败，而不是运行时静默忽略。

## 多场景扩展

首版场景：

- `saloon-exterior`
- `saloon-main-hall`

未来场景必须承担明确产品职责。一个新场景的提案至少说明：用户任务、进入条件、直接URL、移动端布局、静态降级、资源预算和无障碍替代路径。

## AI扩展边界

首版不接入生成式AI。未来如增加受约束问答：

- AI只能读取已发布且符合用户剧透等级的资料。
- 回答必须返回站内资料和原始来源引用。
- 工具调用仍走同一能力注册表与服务端授权。
- AI不可发布、修改、删除内容或改变权限。
- 模型不可用时自动退回确定性对话。

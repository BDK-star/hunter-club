import type { ExperienceConfig } from "../domain/experience";

export const saloonExperienceConfig = {
  version: 1,
  copy: {
    "dialogue.bartender.start":
      "酒保正在擦拭一只空杯。念能力讲解会在测试系统完成后开放，现在先去资料库看看。",
    "dialogue.bounty.start":
      "赏金榜还是空的。社区任务和举报进度将在社区闭环阶段开放。",
    "dialogue.explorer.open": "沿着右侧楼梯上去，资料库的灯已经亮了。",
    "dialogue.explorer.start":
      "第一次来？这里收录的不是传闻，而是可以追溯来源的资料。",
    "dialogue.owner.rules":
      "这里不出售冒充官方的故事，也不陈列来路不明的影像。每条重要资料都要说清来源。",
    "dialogue.owner.start":
      "欢迎，旅客。进门不需要猎人执照，但要尊重剧透边界。",
    "choice.ask.rules": "这里有什么规矩？",
    "choice.open.library": "带我去资料库",
    "choice.return": "明白了",
    "npc.bartender.name": "酒保",
    "npc.bartender.role": "念能力向导 · 服务准备中",
    "npc.bounty.name": "赏金猎人",
    "npc.bounty.role": "社区治理向导 · 服务准备中",
    "npc.explorer.name": "探险者",
    "npc.explorer.role": "资料发现向导",
    "npc.owner.name": "老板",
    "npc.owner.role": "酒吧规则与贡献向导",
    "scene.exterior.description":
      "黄昏下的猎人酒馆门外，访客可以选择剧透范围后推门进入。",
    "scene.exterior.door": "酒吧正门",
    "scene.exterior.label": "猎人酒馆门外",
    "scene.hall.description":
      "一座仍在逐步开放的西部酒吧，四位功能向导分布在大厅中。",
    "scene.hall.exit": "回到门外",
    "scene.hall.label": "猎人酒馆大厅",
  },
  dialogues: [
    {
      actorId: "owner",
      id: "owner-welcome",
      nodes: [
        {
          choices: [
            {
              id: "owner-ask-rules",
              labelKey: "choice.ask.rules",
              nextNodeId: "owner-rules",
            },
          ],
          id: "owner-start",
          textKey: "dialogue.owner.start",
        },
        {
          choices: [],
          id: "owner-rules",
          textKey: "dialogue.owner.rules",
        },
      ],
      startNodeId: "owner-start",
      version: 1,
    },
    {
      actorId: "bartender",
      id: "bartender-welcome",
      nodes: [
        {
          choices: [],
          id: "bartender-start",
          textKey: "dialogue.bartender.start",
        },
      ],
      startNodeId: "bartender-start",
      version: 1,
    },
    {
      actorId: "explorer",
      id: "explorer-library",
      nodes: [
        {
          choices: [
            {
              id: "explorer-open-library",
              labelKey: "choice.open.library",
              nextNodeId: "explorer-open",
            },
          ],
          id: "explorer-start",
          textKey: "dialogue.explorer.start",
        },
        {
          choices: [
            {
              action: "OPEN_LIBRARY",
              id: "explorer-follow",
              labelKey: "choice.open.library",
            },
          ],
          id: "explorer-open",
          textKey: "dialogue.explorer.open",
        },
      ],
      startNodeId: "explorer-start",
      version: 1,
    },
    {
      actorId: "bounty",
      id: "bounty-welcome",
      nodes: [
        {
          choices: [],
          id: "bounty-start",
          textKey: "dialogue.bounty.start",
        },
      ],
      startNodeId: "bounty-start",
      version: 1,
    },
  ],
  scenes: [
    {
      descriptionKey: "scene.exterior.description",
      hotspots: [
        {
          action: "ENTER_SALOON",
          id: "saloon-door",
          kind: "exit",
          labelKey: "scene.exterior.door",
          position: { x: 50, y: 58 },
        },
      ],
      id: "saloon-exterior",
      kind: "exterior",
      labelKey: "scene.exterior.label",
      npcs: [],
      route: "/",
      version: 1,
    },
    {
      descriptionKey: "scene.hall.description",
      hotspots: [
        {
          id: "owner-hotspot",
          kind: "npc",
          labelKey: "npc.owner.name",
          position: { x: 22, y: 56 },
          targetId: "owner",
        },
        {
          id: "bartender-hotspot",
          kind: "npc",
          labelKey: "npc.bartender.name",
          position: { x: 47, y: 47 },
          targetId: "bartender",
        },
        {
          id: "explorer-hotspot",
          kind: "npc",
          labelKey: "npc.explorer.name",
          position: { x: 73, y: 54 },
          targetId: "explorer",
        },
        {
          id: "bounty-hotspot",
          kind: "npc",
          labelKey: "npc.bounty.name",
          position: { x: 87, y: 68 },
          targetId: "bounty",
        },
        {
          action: "RETURN_EXTERIOR",
          id: "hall-exit",
          kind: "exit",
          labelKey: "scene.hall.exit",
          position: { x: 8, y: 78 },
        },
      ],
      id: "saloon-main-hall",
      kind: "hall",
      labelKey: "scene.hall.label",
      npcs: [
        {
          dialogueId: "owner-welcome",
          id: "owner",
          nameKey: "npc.owner.name",
          position: { x: 22, y: 56 },
          roleKey: "npc.owner.role",
          sigil: "掌",
        },
        {
          dialogueId: "bartender-welcome",
          id: "bartender",
          nameKey: "npc.bartender.name",
          position: { x: 47, y: 47 },
          roleKey: "npc.bartender.role",
          sigil: "杯",
        },
        {
          dialogueId: "explorer-library",
          id: "explorer",
          nameKey: "npc.explorer.name",
          position: { x: 73, y: 54 },
          roleKey: "npc.explorer.role",
          sigil: "图",
        },
        {
          dialogueId: "bounty-welcome",
          id: "bounty",
          nameKey: "npc.bounty.name",
          position: { x: 87, y: 68 },
          roleKey: "npc.bounty.role",
          sigil: "榜",
        },
      ],
      route: "/saloon",
      version: 1,
    },
  ],
} as const satisfies ExperienceConfig;

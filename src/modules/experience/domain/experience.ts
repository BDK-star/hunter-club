export const CAPABILITY_ACTIONS = [
  "ENTER_SALOON",
  "OPEN_LIBRARY",
  "RETURN_EXTERIOR",
] as const;

export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[number];

export const SPOILER_LEVELS = ["safe", "anime", "manga"] as const;

export type SpoilerLevel = (typeof SPOILER_LEVELS)[number];

export type DialogueChoice = Readonly<
  | {
      action: CapabilityAction;
      id: string;
      labelKey: string;
      nextNodeId?: never;
    }
  | {
      action?: never;
      id: string;
      labelKey: string;
      nextNodeId: string;
    }
>;

export type DialogueNode = Readonly<{
  choices: readonly DialogueChoice[];
  id: string;
  textKey: string;
}>;

export type DialogueGraph = Readonly<{
  actorId: string;
  id: string;
  nodes: readonly DialogueNode[];
  startNodeId: string;
  version: 1;
}>;

export type SceneNpc = Readonly<{
  dialogueId: string;
  id: string;
  nameKey: string;
  position: Readonly<{ x: number; y: number }>;
  roleKey: string;
  sigil: string;
}>;

export type SceneHotspot = Readonly<
  | {
      action: CapabilityAction;
      id: string;
      kind: "exit";
      labelKey: string;
      position: Readonly<{ x: number; y: number }>;
    }
  | {
      id: string;
      kind: "npc";
      labelKey: string;
      position: Readonly<{ x: number; y: number }>;
      targetId: string;
    }
>;

export type SceneManifest = Readonly<{
  descriptionKey: string;
  hotspots: readonly SceneHotspot[];
  id: string;
  kind: "exterior" | "hall";
  labelKey: string;
  npcs: readonly SceneNpc[];
  route: string;
  version: 1;
}>;

export type ExperienceConfig = Readonly<{
  copy: Readonly<Record<string, string>>;
  dialogues: readonly DialogueGraph[];
  scenes: readonly SceneManifest[];
  version: 1;
}>;

export function parseSpoilerLevel(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return SPOILER_LEVELS.includes(candidate as SpoilerLevel)
    ? (candidate as SpoilerLevel)
    : "safe";
}

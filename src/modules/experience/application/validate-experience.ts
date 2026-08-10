import type {
  DialogueGraph,
  ExperienceConfig,
  SceneManifest,
} from "../domain/experience";
import { isCapabilityAction } from "./capability-registry";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid experience configuration: ${message}`);
  }
}

function assertUnique(values: readonly string[], label: string) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function assertTextKey(copy: Readonly<Record<string, string>>, key: string) {
  assert(
    typeof copy[key] === "string" && copy[key] !== "",
    `missing text key ${key}`,
  );
}

function validateDialogue(
  dialogue: DialogueGraph,
  copy: Readonly<Record<string, string>>,
) {
  assert(
    dialogue.version === 1,
    `dialogue ${dialogue.id} has unsupported version`,
  );
  assert(dialogue.nodes.length > 0, `dialogue ${dialogue.id} has no nodes`);
  assertUnique(
    dialogue.nodes.map((node) => node.id),
    `dialogue ${dialogue.id} node IDs`,
  );

  const nodes = new Map(dialogue.nodes.map((node) => [node.id, node]));
  assert(
    nodes.has(dialogue.startNodeId),
    `dialogue ${dialogue.id} has no start node`,
  );

  for (const node of dialogue.nodes) {
    assertTextKey(copy, node.textKey);
    assertUnique(
      node.choices.map((choice) => choice.id),
      `dialogue ${dialogue.id} choice IDs in ${node.id}`,
    );

    for (const choice of node.choices) {
      assertTextKey(copy, choice.labelKey);
      const hasAction = "action" in choice && choice.action !== undefined;
      const hasNext = "nextNodeId" in choice && choice.nextNodeId !== undefined;
      assert(
        hasAction !== hasNext,
        `choice ${choice.id} must have one outcome`,
      );

      if (hasAction) {
        assert(
          isCapabilityAction(String(choice.action)),
          `choice ${choice.id} uses an unknown capability`,
        );
      }

      if (hasNext) {
        assert(
          nodes.has(String(choice.nextNodeId)),
          `choice ${choice.id} points to a missing node`,
        );
      }
    }
  }

  const reachable = new Set<string>();
  const pending = [dialogue.startNodeId];
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (nodeId === undefined || reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    const node = nodes.get(nodeId);
    if (node === undefined) continue;
    for (const choice of node.choices) {
      if ("nextNodeId" in choice && choice.nextNodeId !== undefined) {
        pending.push(choice.nextNodeId);
      }
    }
  }
  assert(
    reachable.size === dialogue.nodes.length,
    `dialogue ${dialogue.id} contains unreachable nodes`,
  );

  const completable = new Set(
    dialogue.nodes
      .filter(
        (node) =>
          node.choices.length === 0 ||
          node.choices.some(
            (choice) => "action" in choice && choice.action !== undefined,
          ),
      )
      .map((node) => node.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of dialogue.nodes) {
      if (completable.has(node.id)) continue;
      if (
        node.choices.some(
          (choice) =>
            "nextNodeId" in choice &&
            choice.nextNodeId !== undefined &&
            completable.has(choice.nextNodeId),
        )
      ) {
        completable.add(node.id);
        changed = true;
      }
    }
  }
  assert(
    completable.has(dialogue.startNodeId),
    `dialogue ${dialogue.id} cannot reach an action or terminal node`,
  );
}

function validateScene(
  scene: SceneManifest,
  copy: Readonly<Record<string, string>>,
) {
  assert(scene.version === 1, `scene ${scene.id} has unsupported version`);
  assert(
    scene.route.startsWith("/"),
    `scene ${scene.id} route must be internal`,
  );
  assertTextKey(copy, scene.labelKey);
  assertTextKey(copy, scene.descriptionKey);
  assertUnique(
    scene.npcs.map((npc) => npc.id),
    `scene ${scene.id} NPC IDs`,
  );
  assertUnique(
    scene.hotspots.map((hotspot) => hotspot.id),
    `scene ${scene.id} hotspot IDs`,
  );

  const npcIds = new Set(scene.npcs.map((npc) => npc.id));
  for (const npc of scene.npcs) {
    assertTextKey(copy, npc.nameKey);
    assertTextKey(copy, npc.roleKey);
    assert(
      npc.position.x >= 0 && npc.position.x <= 100,
      `${npc.id} x is invalid`,
    );
    assert(
      npc.position.y >= 0 && npc.position.y <= 100,
      `${npc.id} y is invalid`,
    );
  }

  for (const hotspot of scene.hotspots) {
    assertTextKey(copy, hotspot.labelKey);
    assert(
      hotspot.position.x >= 0 && hotspot.position.x <= 100,
      `${hotspot.id} x is invalid`,
    );
    assert(
      hotspot.position.y >= 0 && hotspot.position.y <= 100,
      `${hotspot.id} y is invalid`,
    );
    if (hotspot.kind === "npc") {
      assert(
        npcIds.has(hotspot.targetId),
        `${hotspot.id} targets a missing NPC`,
      );
    } else {
      assert(
        isCapabilityAction(String(hotspot.action)),
        `${hotspot.id} uses an unknown capability`,
      );
    }
  }
}

export function validateExperience(config: ExperienceConfig) {
  assert(config.version === 1, "unsupported root version");
  assert(config.scenes.length > 0, "at least one scene is required");
  assertUnique(
    config.scenes.map((scene) => scene.id),
    "scene IDs",
  );
  assertUnique(
    config.scenes.map((scene) => scene.route),
    "scene routes",
  );
  assertUnique(
    config.dialogues.map((dialogue) => dialogue.id),
    "dialogue IDs",
  );

  for (const scene of config.scenes) validateScene(scene, config.copy);
  for (const dialogue of config.dialogues)
    validateDialogue(dialogue, config.copy);

  const dialogues = new Map(
    config.dialogues.map((dialogue) => [dialogue.id, dialogue]),
  );
  const referencedDialogueIds = new Set<string>();
  for (const scene of config.scenes) {
    for (const npc of scene.npcs) {
      const dialogue = dialogues.get(npc.dialogueId);
      assert(dialogue !== undefined, `${npc.id} references a missing dialogue`);
      assert(
        dialogue.actorId === npc.id,
        `${npc.id} dialogue actor does not match`,
      );
      referencedDialogueIds.add(npc.dialogueId);
    }
  }
  assert(
    referencedDialogueIds.size === config.dialogues.length,
    "every dialogue must belong to an NPC",
  );

  return config;
}

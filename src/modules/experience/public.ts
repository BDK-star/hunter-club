import { resolveCapability } from "./application/capability-registry";
import { validateExperience } from "./application/validate-experience";
import { saloonExperienceConfig } from "./config/saloon";

export {
  listCapabilities,
  resolveCapability,
} from "./application/capability-registry";
export { parseSpoilerLevel } from "./domain/experience";
export type {
  DialogueGraph,
  ExperienceConfig,
  SceneManifest,
  SpoilerLevel,
} from "./domain/experience";
export { NpcDialogue } from "./presentation/npc-dialogue";

const experience = validateExperience(saloonExperienceConfig);

export function getSaloonExperience() {
  return experience;
}

export function getSceneByRoute(route: string) {
  const scene = experience.scenes.find(
    (candidate) => candidate.route === route,
  );
  if (scene === undefined) throw new Error(`Unknown scene route: ${route}`);
  return scene;
}

export function getDialogueById(dialogueId: string) {
  const dialogue = experience.dialogues.find(
    (candidate) => candidate.id === dialogueId,
  );
  if (dialogue === undefined)
    throw new Error(`Unknown dialogue: ${dialogueId}`);
  return dialogue;
}

export function getExitHref(action: "ENTER_SALOON" | "RETURN_EXTERIOR") {
  return resolveCapability(action).href;
}

import { describe, expect, it } from "vitest";

import { validateExperience } from "./application/validate-experience";
import { saloonExperienceConfig } from "./config/saloon";
import type { ExperienceConfig } from "./domain/experience";
import { getSceneByRoute, listCapabilities, parseSpoilerLevel } from "./public";

describe("experience configuration", () => {
  it("validates the versioned exterior, hall, NPCs, and dialogue graph", () => {
    expect(validateExperience(saloonExperienceConfig)).toBe(
      saloonExperienceConfig,
    );
    expect(getSceneByRoute("/saloon").npcs).toHaveLength(4);
  });

  it("rejects unknown capability actions at runtime", () => {
    const broken = {
      ...saloonExperienceConfig,
      dialogues: saloonExperienceConfig.dialogues.map((dialogue) =>
        dialogue.id === "explorer-library"
          ? {
              ...dialogue,
              nodes: dialogue.nodes.map((node) =>
                node.id === "explorer-open"
                  ? {
                      ...node,
                      choices: [
                        {
                          action: "DELETE_DATABASE",
                          id: "unsafe-action",
                          labelKey: "choice.open.library",
                        },
                      ],
                    }
                  : node,
              ),
            }
          : dialogue,
      ),
    } as unknown as ExperienceConfig;

    expect(() => validateExperience(broken)).toThrow("unknown capability");
  });

  it("rejects unreachable dialogue nodes", () => {
    const owner = saloonExperienceConfig.dialogues[0];
    const broken = {
      ...saloonExperienceConfig,
      dialogues: [
        {
          ...owner,
          nodes: [
            ...owner.nodes,
            {
              choices: [],
              id: "orphan",
              textKey: "dialogue.owner.rules",
            },
          ],
        },
        ...saloonExperienceConfig.dialogues.slice(1),
      ],
    } as unknown as ExperienceConfig;

    expect(() => validateExperience(broken)).toThrow("unreachable nodes");
  });

  it("keeps every capability on a stable internal route", () => {
    expect(listCapabilities()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "OPEN_LIBRARY", href: "/library" }),
      ]),
    );
    for (const capability of listCapabilities()) {
      expect(capability.href).toMatch(/^\/[a-z/-]*$/);
    }
  });

  it("uses the conservative spoiler level for missing or invalid values", () => {
    expect(parseSpoilerLevel(undefined)).toBe("safe");
    expect(parseSpoilerLevel("unknown")).toBe("safe");
    expect(parseSpoilerLevel("anime")).toBe("anime");
  });
});

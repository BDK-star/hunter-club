"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DialogueGraph } from "../domain/experience";
import { resolveCapability } from "../application/capability-registry";

type NpcDialogueProps = Readonly<{
  copy: Readonly<Record<string, string>>;
  dialogue: DialogueGraph;
}>;

export function NpcDialogue({ copy, dialogue }: NpcDialogueProps) {
  const nodes = useMemo(
    () => new Map(dialogue.nodes.map((node) => [node.id, node])),
    [dialogue.nodes],
  );
  const [nodeId, setNodeId] = useState(dialogue.startNodeId);
  const textRef = useRef<HTMLParagraphElement>(null);
  const node = nodes.get(nodeId) ?? nodes.get(dialogue.startNodeId);

  useEffect(() => {
    if (nodeId !== dialogue.startNodeId) textRef.current?.focus();
  }, [dialogue.startNodeId, nodeId]);

  if (node === undefined) return null;

  return (
    <div className="dialogue" aria-live="polite">
      <p className="dialogue-text" ref={textRef} tabIndex={-1}>
        {copy[node.textKey]}
      </p>
      {node.choices.length > 0 ? (
        <div className="dialogue-choices">
          {node.choices.map((choice) => {
            if ("action" in choice && choice.action !== undefined) {
              const capability = resolveCapability(choice.action);
              return (
                <Link
                  className="dialogue-choice"
                  href={capability.href}
                  key={choice.id}
                >
                  {copy[choice.labelKey]}
                </Link>
              );
            }

            return (
              <button
                className="dialogue-choice"
                key={choice.id}
                onClick={() => setNodeId(choice.nextNodeId)}
                type="button"
              >
                {copy[choice.labelKey]}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          className="dialogue-reset"
          onClick={() => setNodeId(dialogue.startNodeId)}
          type="button"
        >
          从头再听
        </button>
      )}
      <noscript>
        <p className="static-fallback-note">
          对话需要JavaScript；你仍可使用页面顶部的标准导航。
        </p>
      </noscript>
    </div>
  );
}
